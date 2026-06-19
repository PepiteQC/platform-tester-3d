import { bus } from "./EventBus.js";
import { StaticProp }      from "../entities/props/StaticProp.js";
import { InteractiveProp } from "../entities/props/InteractiveProp.js";
import { PhysicsProp }     from "../entities/props/PhysicsProp.js";
import { TriggerZone }     from "../entities/addons/TriggerZone.js";
import { NpcEntity }       from "../entities/addons/NpcEntity.js";

// ─── Registre des types ───────────────────────────────────────────────────────
export const TYPE_REGISTRY = new Map([
  ["static_prop",      StaticProp],
  ["interactive_prop", InteractiveProp],
  ["physics_prop",     PhysicsProp],
  ["trigger_zone",     TriggerZone],
  ["npc",              NpcEntity],
]);

export function registerEntityType(typeName, EntityClass) {
  if (TYPE_REGISTRY.has(typeName)) {
    console.warn(`[EntityManager] Overwriting type: ${typeName}`);
  }
  TYPE_REGISTRY.set(typeName, EntityClass);
  console.log(`[EntityManager] Registered type: ${typeName}`);
}

// ─── Manager ──────────────────────────────────────────────────────────────────
export class EntityManager {
  #entities = new Map();
  #byType   = new Map();
  #byTag    = new Map();

  constructor() {
    bus.on("entity:created",   ({ entity }) => this.#index(entity));
    bus.on("entity:destroyed", ({ entity }) => this.#unindex(entity));
  }

  create(type, data = {}) {
    const EntityClass = TYPE_REGISTRY.get(type);
    if (!EntityClass) {
      throw new Error(
        `[EntityManager] Unknown type: "${type}". Available: ${[...TYPE_REGISTRY.keys()].join(", ")}`
      );
    }
    const entity = new EntityClass({ ...data, type });
    this.#entities.set(entity.id, entity);
    return entity;
  }

  hydrate(data = {}) {
    return this.create(data.type, data);
  }

  get(id)         { return this.#entities.get(id) ?? null; }
  has(id)         { return this.#entities.has(id); }
  all()           { return [...this.#entities.values()]; }
  count()         { return this.#entities.size; }
  byType(type)    { return [...(this.#byType.get(type) ?? [])].map((id) => this.#entities.get(id)).filter(Boolean); }
  byTag(tag)      { return [...(this.#byTag.get(tag)   ?? [])].map((id) => this.#entities.get(id)).filter(Boolean); }
  byCategory(cat) { return this.all().filter((e) => e.category === cat); }

  update(id, patch = {}) {
    const entity = this.get(id);
    if (!entity) throw new Error(`Entity not found: ${id}`);
    return entity.update(patch);
  }

  destroy(id) {
    const entity = this.get(id);
    if (!entity) return false;
    entity.destroy();
    this.#entities.delete(id);
    this.#unindex(entity);
    return true;
  }

  toJSON() {
    return this.all().map((e) => e.toJSON());
  }

  loadFromJSON(arr = []) {
    let loaded = 0;
    for (const data of arr) {
      try {
        if (!TYPE_REGISTRY.has(data.type)) {
          console.warn(`[EntityManager] Skipping unknown type: ${data.type}`);
          continue;
        }
        this.hydrate(data);
        loaded++;
      } catch (err) {
        console.error(`[EntityManager] Failed to hydrate ${data.id}:`, err.message);
      }
    }
    console.log(`[EntityManager] Loaded ${loaded}/${arr.length} entities`);
    return loaded;
  }

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
    for (const tag of entity.tags ?? []) {
      this.#byTag.get(tag)?.delete(entity.id);
    }
  }
}

export const entityManager = new EntityManager();
