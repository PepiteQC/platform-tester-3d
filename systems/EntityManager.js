import { bus } from "./EventBus.js";
import { StaticProp }      from "../entities/props/StaticProp.js";
import { InteractiveProp } from "../entities/props/InteractiveProp.js";
import { PhysicsProp }     from "../entities/props/PhysicsProp.js";
import { TriggerZone }     from "../entities/addons/TriggerZone.js";
import { NpcEntity }       from "../entities/addons/NpcEntity.js";

// ============================================================================
// EntityManager v2
//
// Nouveautés v2 :
// - registerEntityType() émet maintenant "entitytype:registered" sur le bus
// - find(predicate) / findOne(predicate) — requêtes custom
// - query({ type, tag, category, near, radius }) — requête combinée
// - createMany(list) / destroyMany(ids) — opérations batch avec rapport
// - clone(id, overrides?) — duplique une entité existante
// - snapshot() / restore(snapshot) — undo/redo / sauvegarde rapide en mémoire
// - exists guard sur create() si un id est fourni explicitement et déjà pris
// - getTypes() / getTags() — introspection des index
// - stats() — comptage par type/tag/catégorie
// - clear() — vide tout proprement (avec events + désindexation)
// - Émission d'évènements enrichis : "entity:before-destroy", "entity:updated"
// - validateEntityData() optionnel pluggable pour valider avant hydrate
// ============================================================================

export const TYPE_REGISTRY = new Map([
  ["static_prop",      StaticProp],
  ["interactive_prop", InteractiveProp],
  ["physics_prop",     PhysicsProp],
  ["trigger_zone",     TriggerZone],
  ["npc",              NpcEntity],
]);

export function registerEntityType(typeName, EntityClass) {
  const wasOverwrite = TYPE_REGISTRY.has(typeName);
  if (wasOverwrite) console.warn(`[EntityManager] Overwriting type: ${typeName}`);
  TYPE_REGISTRY.set(typeName, EntityClass);
  console.log(`[EntityManager] Registered type: ${typeName}`);
  bus.emit("entitytype:registered", { typeName, EntityClass, wasOverwrite });
}

export function unregisterEntityType(typeName) {
  const removed = TYPE_REGISTRY.delete(typeName);
  if (removed) bus.emit("entitytype:unregistered", { typeName });
  return removed;
}

function distance(a, b) {
  if (!a || !b) return Infinity;
  const dx = (a.x ?? 0) - (b.x ?? 0);
  const dy = (a.y ?? 0) - (b.y ?? 0);
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export class EntityManager {
  #entities = new Map();
  #byType   = new Map();
  #byTag    = new Map();

  /** Hook optionnel : (type, data) => true|string. Retourner une string = erreur de validation. */
  validateEntityData = null;

  constructor() {
    bus.on("entity:created",   ({ entity }) => this.#index(entity));
    bus.on("entity:destroyed", ({ entity }) => this.#unindex(entity));
  }

  // ==========================================================================
  // Création
  // ==========================================================================

  create(type, data = {}) {
    const EntityClass = TYPE_REGISTRY.get(type);
    if (!EntityClass) {
      throw new Error(`[EntityManager] Unknown type: "${type}". Available: ${[...TYPE_REGISTRY.keys()].join(", ")}`);
    }

    if (data.id && this.#entities.has(data.id)) {
      throw new Error(`[EntityManager] Entity with id "${data.id}" already exists.`);
    }

    if (this.validateEntityData) {
      const result = this.validateEntityData(type, data);
      if (result !== true) {
        throw new Error(`[EntityManager] Validation failed for type "${type}": ${result || 'invalid data'}`);
      }
    }

    const entity = new EntityClass({ ...data, type });
    this.#entities.set(entity.id, entity);
    return entity;
  }

  hydrate(data = {}) { return this.create(data.type, data); }

  /**
   * Crée plusieurs entités en lot. Ne lève pas d'exception globale :
   * chaque échec est rapporté individuellement.
   * @returns {{ created: Entity[], failed: { data, error }[] }}
   */
  createMany(list = []) {
    const created = [];
    const failed = [];

    for (const data of list) {
      try {
        created.push(this.hydrate(data));
      } catch (error) {
        failed.push({ data, error: error.message });
      }
    }

    bus.emit("entity:batch-created", { created, failed });
    return { created, failed };
  }

  /** Duplique une entité existante avec un nouvel id. */
  clone(id, overrides = {}) {
    const source = this.get(id);
    if (!source) throw new Error(`[EntityManager] Cannot clone, entity not found: ${id}`);

    const sourceData = typeof source.toJSON === 'function' ? source.toJSON() : { ...source };
    const { id: _omit, ...rest } = sourceData;

    return this.hydrate({ ...rest, ...overrides });
  }

  // ==========================================================================
  // Lecture simple
  // ==========================================================================

  get(id)         { return this.#entities.get(id) ?? null; }
  has(id)         { return this.#entities.has(id); }
  all()           { return [...this.#entities.values()]; }
  count()         { return this.#entities.size; }
  byType(type)    { return [...(this.#byType.get(type) ?? [])].map(id => this.#entities.get(id)).filter(Boolean); }
  byTag(tag)      { return [...(this.#byTag.get(tag)   ?? [])].map(id => this.#entities.get(id)).filter(Boolean); }
  byCategory(cat) { return this.all().filter(e => e.category === cat); }

  // ==========================================================================
  // Requêtes avancées v2
  // ==========================================================================

  /** Retourne toutes les entités satisfaisant le prédicat. */
  find(predicate) {
    return this.all().filter(predicate);
  }

  /** Retourne la première entité satisfaisant le prédicat, ou null. */
  findOne(predicate) {
    for (const entity of this.#entities.values()) {
      if (predicate(entity)) return entity;
    }
    return null;
  }

  /**
   * Requête combinée.
   * @param {{ type?: string, tag?: string, category?: string, near?: {x,y,z}, radius?: number, predicate?: Function }} filters
   */
  query(filters = {}) {
    let results = this.all();

    if (filters.type) results = results.filter(e => e.type === filters.type);
    if (filters.tag) results = results.filter(e => (e.tags ?? []).includes(filters.tag));
    if (filters.category) results = results.filter(e => e.category === filters.category);

    if (filters.near && typeof filters.radius === 'number') {
      results = results.filter(e => distance(e.position, filters.near) <= filters.radius);
    }

    if (typeof filters.predicate === 'function') {
      results = results.filter(filters.predicate);
    }

    return results;
  }

  /** Entité la plus proche d'un point, parmi un sous-ensemble optionnel filtré par type. */
  nearest(point, { type = null, maxRadius = Infinity } = {}) {
    const pool = type ? this.byType(type) : this.all();
    let best = null;
    let bestDist = maxRadius;

    for (const entity of pool) {
      const d = distance(entity.position, point);
      if (d <= bestDist) {
        best = entity;
        bestDist = d;
      }
    }

    return best;
  }

  // ==========================================================================
  // Mise à jour
  // ==========================================================================

  update(id, patch = {}) {
    const entity = this.get(id);
    if (!entity) throw new Error(`Entity not found: ${id}`);
    const result = entity.update(patch);
    bus.emit("entity:updated", { entity, patch });
    return result;
  }

  /** Met à jour plusieurs entités en lot avec le même patch ou via une fonction (entity) => patch. */
  updateMany(ids, patchOrFn) {
    const updated = [];
    const failed = [];

    for (const id of ids) {
      try {
        const patch = typeof patchOrFn === 'function' ? patchOrFn(this.get(id)) : patchOrFn;
        updated.push(this.update(id, patch));
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { updated, failed };
  }

  // ==========================================================================
  // Destruction
  // ==========================================================================

  destroy(id) {
    const entity = this.get(id);
    if (!entity) return false;

    bus.emit("entity:before-destroy", { entity });

    entity.destroy();
    this.#entities.delete(id);
    this.#unindex(entity);
    return true;
  }

  /** Détruit plusieurs entités, rapporte le nombre réellement détruit. */
  destroyMany(ids) {
    let destroyed = 0;
    for (const id of ids) {
      if (this.destroy(id)) destroyed++;
    }
    bus.emit("entity:batch-destroyed", { ids, destroyed });
    return destroyed;
  }

  /** Détruit toutes les entités satisfaisant le prédicat. */
  destroyWhere(predicate) {
    const ids = this.find(predicate).map(e => e.id);
    return this.destroyMany(ids);
  }

  /** Vide complètement le manager (avec événements et désindexation propres). */
  clear() {
    const ids = [...this.#entities.keys()];
    this.destroyMany(ids);
    this.#byType.clear();
    this.#byTag.clear();
    bus.emit("entity:cleared", { count: ids.length });
  }

  // ==========================================================================
  // Sérialisation
  // ==========================================================================

  toJSON() { return this.all().map(e => e.toJSON()); }

  loadFromJSON(arr = []) {
    let loaded = 0;
    for (const data of arr) {
      try {
        if (!TYPE_REGISTRY.has(data.type)) { console.warn(`[EntityManager] Skipping unknown type: ${data.type}`); continue; }
        this.hydrate(data);
        loaded++;
      } catch (err) { console.error(`[EntityManager] Failed to hydrate ${data.id}:`, err.message); }
    }
    console.log(`[EntityManager] Loaded ${loaded}/${arr.length} entities`);
    return loaded;
  }

  // ==========================================================================
  // Snapshot / Restore v2 — utile pour undo, sauvegarde rapide, time-travel debug
  // ==========================================================================

  /** Capture l'état complet actuel (sérialisé), sans affecter le manager. */
  snapshot() {
    return {
      takenAt: Date.now(),
      entities: this.toJSON(),
    };
  }

  /** Remplace tout l'état actuel par celui d'un snapshot précédemment capturé. */
  restore(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.entities)) {
      throw new Error('[EntityManager] Invalid snapshot passed to restore().');
    }
    this.clear();
    const loaded = this.loadFromJSON(snapshot.entities);
    bus.emit("entity:restored", { count: loaded, takenAt: snapshot.takenAt });
    return loaded;
  }

  // ==========================================================================
  // Introspection v2
  // ==========================================================================

  getTypes() { return [...this.#byType.keys()]; }
  getTags()  { return [...this.#byTag.keys()]; }

  /** Compte d'entités par type, par tag, et par catégorie. */
  stats() {
    const byType = {};
    for (const [type, set] of this.#byType) byType[type] = set.size;

    const byTag = {};
    for (const [tag, set] of this.#byTag) byTag[tag] = set.size;

    const byCategory = {};
    for (const entity of this.all()) {
      if (!entity.category) continue;
      byCategory[entity.category] = (byCategory[entity.category] ?? 0) + 1;
    }

    return { total: this.count(), byType, byTag, byCategory };
  }

  // ==========================================================================
  // Indexation interne
  // ==========================================================================

  #index(entity) {
    if (!this.#byType.has(entity.type)) this.#byType.set(entity.type, new Set());
    this.#byType.get(entity.type).add(entity.id);
    for (const tag of entity.tags ?? []) {
      if (!this.#byTag.has(tag)) this.#byTag.set(tag, new Set());
      this.#byTag.get(tag).add(entity.id);
    }
  }

  #unindex(entity) {
    this.#byType.get(entity.type)?.delete(entity.id);
    for (const tag of entity.tags ?? []) this.#byTag.get(tag)?.delete(entity.id);
  }
}

export const entityManager = new EntityManager();