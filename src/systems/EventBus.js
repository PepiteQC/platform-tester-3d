/**
 * Event Bus v2 - Centralized event handling system
 *
 * Nouveautés v2 :
 * - Wildcards namespacés ("room:*" écoute "room:enter", "room:leave", etc.)
 * - Priorités sur les handlers (les plus prioritaires s'exécutent en premier)
 * - Middleware pipeline (transformer/bloquer un événement avant émission)
 * - once() retourne maintenant un unsubscribe comme on()
 * - waitFor() avec AbortSignal optionnel pour annulation externe
 * - emit() retourne le nombre de handlers exécutés
 * - emitAsync() pour attendre les handlers async (Promise.allSettled)
 * - replay() pour rejouer l'historique sur un nouveau handler
 * - pause()/resume() pour suspendre temporairement la diffusion (queue les events)
 * - Stats de performance par type d'événement (count, totalMs, avgMs, lastError)
 * - offAll(eventType) pour retirer tous les handlers d'un type
 * - debug mode avec logs structurés
 * - getEventTypes() pour introspection
 */

const WILDCARD = '*';

export class EventBus {
  constructor(options = {}) {
    this.listeners = new Map();        // eventType -> Set<{ handler, priority, once }>
    this.history = [];
    this.maxHistorySize = options.maxHistorySize ?? 100;

    this.middlewares = [];             // (event) => event | null
    this.stats = new Map();            // eventType -> { count, totalMs, avgMs, lastError, lastEmittedAt }

    this.debug = options.debug ?? false;
    this.paused = false;
    this.pausedQueue = [];

    this._wildcardCache = new Map();   // pattern -> RegExp
  }

  // ==========================================================================
  // Souscription
  // ==========================================================================

  /**
   * @param {string} eventType - type exact ou pattern wildcard ("*", "room:*")
   * @param {Function} handler
   * @param {{ priority?: number }} [opts]
   * @returns {Function} unsubscribe
   */
  on(eventType, handler, opts = {}) {
    if (typeof handler !== 'function') {
      throw new TypeError(`EventBus.on("${eventType}") attend une fonction comme handler.`);
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const entry = { handler, priority: opts.priority ?? 0, once: false };
    this.listeners.get(eventType).add(entry);

    if (this.debug) console.debug(`[EventBus] +listener "${eventType}" (priority=${entry.priority})`);

    return () => this.off(eventType, handler);
  }

  off(eventType, handler) {
    const set = this.listeners.get(eventType);
    if (!set) return;

    for (const entry of set) {
      if (entry.handler === handler) {
        set.delete(entry);
        break;
      }
    }

    if (set.size === 0) this.listeners.delete(eventType);
  }

  /** Retire tous les handlers d'un type d'événement précis. */
  offAll(eventType) {
    this.listeners.delete(eventType);
  }

  once(eventType, handler, opts = {}) {
    const wrapper = (data) => {
      this.off(eventType, wrapper);
      handler(data);
    };
    this.on(eventType, wrapper, opts);
    return () => this.off(eventType, wrapper);
  }

  // ==========================================================================
  // Middleware
  // ==========================================================================

  /**
   * Ajoute un middleware exécuté avant chaque emit().
   * Le middleware reçoit l'event { type, data, timestamp } et doit retourner :
   * - l'event (éventuellement modifié) pour continuer la chaîne
   * - null/false pour bloquer l'émission entièrement
   * @param {(event: object) => object|null|false} fn
   * @returns {Function} pour retirer le middleware
   */
  use(fn) {
    this.middlewares.push(fn);
    return () => {
      const idx = this.middlewares.indexOf(fn);
      if (idx >= 0) this.middlewares.splice(idx, 1);
    };
  }

  _runMiddlewares(event) {
    let current = event;
    for (const mw of this.middlewares) {
      try {
        const result = mw(current);
        if (result === null || result === false) return null;
        if (result && typeof result === 'object') current = result;
      } catch (error) {
        console.error('[EventBus] Middleware error:', error);
      }
    }
    return current;
  }

  // ==========================================================================
  // Émission
  // ==========================================================================

  /**
   * Émet un événement de façon synchrone.
   * @returns {number} nombre de handlers exécutés
   */
  emit(eventType, data = {}) {
    let event = { type: eventType, data, timestamp: Date.now() };

    event = this._runMiddlewares(event);
    if (!event) {
      if (this.debug) console.debug(`[EventBus] emit("${eventType}") bloqué par middleware`);
      return 0;
    }

    if (this.paused) {
      this.pausedQueue.push(event);
      return 0;
    }

    return this._dispatch(event);
  }

  /**
   * Émet un événement et attend que tous les handlers async résolvent.
   * @returns {Promise<number>} nombre de handlers exécutés
   */
  async emitAsync(eventType, data = {}) {
    let event = { type: eventType, data, timestamp: Date.now() };

    event = this._runMiddlewares(event);
    if (!event) return 0;

    if (this.paused) {
      this.pausedQueue.push(event);
      return 0;
    }

    return this._dispatch(event, { awaitHandlers: true });
  }

  _dispatch(event, { awaitHandlers = false } = {}) {
    const { type: eventType, data } = event;

    this.history.push(event);
    if (this.history.length > this.maxHistorySize) this.history.shift();

    const matchedEntries = this._collectMatchingHandlers(eventType);

    if (matchedEntries.length === 0) {
      if (this.debug) console.debug(`[EventBus] emit("${eventType}") — aucun listener`);
      return 0;
    }

    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const pending = [];

    for (const { eventType: matchedType, entry } of matchedEntries) {
      const payload = matchedType === WILDCARD || matchedType.endsWith(':*') ? event : data;

      try {
        const result = entry.handler(payload);
        if (awaitHandlers && result && typeof result.then === 'function') {
          pending.push(result.catch(error => {
            console.error(`[EventBus] handler async error for ${eventType}:`, error);
            this._recordError(eventType, error);
          }));
        }
      } catch (error) {
        console.error(`[EventBus] handler error for ${eventType}:`, error);
        this._recordError(eventType, error);
      }
    }

    this._recordStats(eventType, start);

    if (awaitHandlers && pending.length > 0) {
      return Promise.allSettled(pending).then(() => matchedEntries.length);
    }

    return matchedEntries.length;
  }

  /** Trouve tous les (eventType, entry) qui matchent, triés par priorité décroissante. */
  _collectMatchingHandlers(eventType) {
    const results = [];

    for (const [registeredType, set] of this.listeners) {
      if (this._matches(registeredType, eventType)) {
        for (const entry of set) {
          results.push({ eventType: registeredType, entry });
        }
      }
    }

    results.sort((a, b) => b.entry.priority - a.entry.priority);
    return results;
  }

  _matches(registeredType, emittedType) {
    if (registeredType === emittedType) return true;
    if (registeredType === WILDCARD) return true;

    if (registeredType.endsWith(':*')) {
      const prefix = registeredType.slice(0, -1); // garde le ':'
      return emittedType.startsWith(prefix);
    }

    return false;
  }

  _recordStats(eventType, startTime) {
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    const prev = this.stats.get(eventType) ?? { count: 0, totalMs: 0, avgMs: 0, lastError: null, lastEmittedAt: null };

    const count = prev.count + 1;
    const totalMs = prev.totalMs + elapsed;

    this.stats.set(eventType, {
      count,
      totalMs,
      avgMs: totalMs / count,
      lastError: prev.lastError,
      lastEmittedAt: Date.now(),
    });
  }

  _recordError(eventType, error) {
    const prev = this.stats.get(eventType) ?? { count: 0, totalMs: 0, avgMs: 0, lastError: null, lastEmittedAt: null };
    this.stats.set(eventType, { ...prev, lastError: error?.message ?? String(error) });
  }

  // ==========================================================================
  // Attente d'événement
  // ==========================================================================

  /**
   * @param {string} eventType
   * @param {number} [timeout=5000]
   * @param {AbortSignal} [signal] - permet d'annuler l'attente de l'extérieur
   */
  waitFor(eventType, timeout = 5000, signal) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onAbort);
      };

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.off(eventType, handler);
        cleanup();
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      const onAbort = () => {
        if (settled) return;
        settled = true;
        this.off(eventType, handler);
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      const handler = (data) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(data);
      };

      if (signal) {
        if (signal.aborted) { onAbort(); return; }
        signal.addEventListener('abort', onAbort);
      }

      this.once(eventType, handler);
    });
  }

  // ==========================================================================
  // Pause / Resume
  // ==========================================================================

  /** Suspend la diffusion : les emit() suivants sont mis en file d'attente. */
  pause() {
    this.paused = true;
  }

  /** Reprend la diffusion et vide la file en attente, dans l'ordre d'arrivée. */
  resume() {
    this.paused = false;
    const queue = this.pausedQueue;
    this.pausedQueue = [];
    for (const event of queue) {
      this._dispatch(event);
    }
  }

  // ==========================================================================
  // Replay / Historique
  // ==========================================================================

  /**
   * Rejoue l'historique (ou un sous-ensemble filtré) sur un handler donné,
   * sans re-déclencher les autres listeners ni ré-émettre réellement l'event.
   * Utile pour "rattraper" un listener qui s'abonne tardivement.
   */
  replay(handler, filter = null) {
    const events = filter ? this.history.filter(e => e.type === filter) : [...this.history];
    for (const event of events) {
      try {
        handler(event.data, event);
      } catch (error) {
        console.error('[EventBus] replay handler error:', error);
      }
    }
    return events.length;
  }

  clear() {
    this.listeners.clear();
  }

  clearHistory() {
    this.history = [];
  }

  // ==========================================================================
  // Introspection
  // ==========================================================================

  getListeners(eventType) {
    const set = this.listeners.get(eventType);
    return set ? [...set].map(e => e.handler) : [];
  }

  getHistory(filter = null) {
    if (!filter) return [...this.history];
    return this.history.filter(e => e.type === filter);
  }

  /** Liste tous les types d'événements actuellement écoutés. */
  getEventTypes() {
    return [...this.listeners.keys()];
  }

  /** Stats de perf par type d'événement émis : { count, totalMs, avgMs, lastError, lastEmittedAt } */
  getStats(eventType = null) {
    if (eventType) return this.stats.get(eventType) ?? null;
    return Object.fromEntries(this.stats);
  }

  resetStats() {
    this.stats.clear();
  }
}

export default EventBus;