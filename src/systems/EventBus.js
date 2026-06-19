// src/systems/EventBus.js
export class EventBus {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(fn);
    return () => this.#listeners.get(event).delete(fn); // unsubscribe
  }

  emit(event, payload) {
    for (const fn of this.#listeners.get(event) ?? []) {
      try { fn(payload); }
      catch (err) { console.error(`[EventBus] Error in "${event}":`, err.message); }
    }
  }

  once(event, fn) {
    const unsub = this.on(event, (payload) => { fn(payload); unsub(); });
  }
}

export const bus = new EventBus();