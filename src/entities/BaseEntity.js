import crypto from "node:crypto";
import { bus } from "../systems/EventBus.js";

export class BaseEntity {
  static type     = "base";
  static category = "generic";

  constructor(data = {}) {
    this.id       = String(data.id || `${this.constructor.type}_${crypto.randomUUID().slice(0,8)}`);
    this.type     = this.constructor.type;
    this.category = this.constructor.category;
    this.name     = String(data.name || this.constructor.type);
    this.position = this.#vec3(data.position, [0,0,0]);
    this.rotation = this.#vec3(data.rotation, [0,0,0]);
    this.size     = this.#vec3(data.size,     [1,1,1]);
    this.color    = data.color    || "#ffffff";
    this.material = data.material || "poly_concrete_sidewalk";
    this.locked   = Boolean(data.locked  ?? false);
    this.visible  = Boolean(data.visible ?? true);
    this.tags     = Array.isArray(data.tags) ? data.tags : [];
    this.metadata = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.onInit?.(data);
    bus.emit("entity:created", { entity: this });
  }

  #vec3(value, fallback) {
    if (!Array.isArray(value) || value.length < 3) return [...fallback];
    const out = value.slice(0,3).map(Number);
    return out.some(n => !Number.isFinite(n)) ? [...fallback] : out;
  }

  update(patch = {}) {
    this.onUpdate?.(patch);
    this.updatedAt = new Date().toISOString();
    bus.emit("entity:updated", { entity: this, patch });
    return this;
  }

  destroy() {
    this.onDestroy?.();
    bus.emit("entity:destroyed", { entity: this });
  }

  addTag(tag)    { if (!this.tags.includes(tag)) this.tags.push(tag); return this; }
  removeTag(tag) { this.tags = this.tags.filter(t => t !== tag); return this; }
  hasTag(tag)    { return this.tags.includes(tag); }

  toJSON() {
    return {
      id: this.id, type: this.type, category: this.category,
      name: this.name, position: this.position, rotation: this.rotation,
      size: this.size, color: this.color, material: this.material,
      locked: this.locked, visible: this.visible, tags: this.tags,
      metadata: this.metadata, createdAt: this.createdAt, updatedAt: this.updatedAt,
    };
  }
}
