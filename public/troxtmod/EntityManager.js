// ════════════════════════════════════════════════════════════
//  TroxTMod EntityManager — Client 3D
//  Three.js + Cannon-es + EventBus
//  Gère tout le cycle de vie des entités dans la scène
// ════════════════════════════════════════════════════════════

import * as THREE  from "three";
import * as CANNON from "cannon-es";

// ── EventBus interne ─────────────────────────────────────────
class EventBus {
  #h = new Map();
  on(e, fn)  { if (!this.#h.has(e)) this.#h.set(e, []); this.#h.get(e).push(fn); return () => this.off(e, fn); }
  off(e, fn) { this.#h.set(e, (this.#h.get(e) || []).filter(h => h !== fn)); }
  emit(e, d) { (this.#h.get(e) || []).forEach(h => { try { h(d); } catch(err) { console.warn("[EventBus]", err); } }); }
}

// ── BaseEntity — classe mère de toutes les entités ───────────
export class BaseEntity {
  static nextId = 1;

  constructor(options = {}) {
    this.id       = options.id   || `entity_${BaseEntity.nextId++}_${Math.random().toString(36).slice(2,7)}`;
    this.type     = options.type || "base_entity";
    this.name     = options.name || this.type;
    this.tags     = options.tags || [];
    this.active   = true;
    this.visible  = options.visible ?? true;
    this.metadata = options.metadata || {};

    // Three.js
    this.mesh     = null;
    this.group    = new THREE.Group();

    // Cannon-es
    this.body     = null;
    this.mass     = options.mass ?? 1;
    this.friction = options.friction ?? 0.5;
    this.restitution = options.restitution ?? 0.3;

    // Position/Rotation/Scale
    this.position = options.position || { x:0, y:0, z:0 };
    this.rotation = options.rotation || { x:0, y:0, z:0, w:1 };
    this.scale    = options.scale    || 1;

    // Couleur
    this.color    = options.color || "#ffffff";

    // Stats
    this.health    = options.health    ?? 100;
    this.maxHealth = options.maxHealth ?? 100;

    // Callbacks
    this.onCollide  = options.onCollide  || null;
    this.onInteract = options.onInteract || null;
    this.onDestroyed = options.onDestroyed || null;

    // Création
    this.createdAt  = Date.now();
    this.updatedAt  = Date.now();

    // EventBus (injecté par EntityManager)
    this.eventBus   = options.eventBus || null;
  }

  // ── Initialisation scène + physique ──────────────────────
  initialize(scene, world, eventBus) {
    this.scene    = scene;
    this.world    = world;
    this.eventBus = eventBus;

    this.createMesh();
    this.createBody();
    this.setupCollision();
  }

  // ── Mesh Three.js ─────────────────────────────────────────
  createMesh() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(this.color) });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.mesh.userData.entityId = this.id;
    this.group.add(this.mesh);
  }

  // ── Corps physique Cannon-es ──────────────────────────────
  createBody() {
    this.body = new CANNON.Body({
      mass:     this.mass,
      material: new CANNON.Material({ friction: this.friction, restitution: this.restitution }),
      shape:    new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
      position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
      linearDamping:  0.1,
      angularDamping: 0.1,
    });
    this.body.userData = { entityId: this.id };
  }

  // ── Collision ─────────────────────────────────────────────
  setupCollision() {
    if (!this.body) return;
    this.body.addEventListener("collide", (e) => {
      this.onCollide?.(e);
      this.eventBus?.emit("entity_collision", { entity: this, event: e });
    });
  }

  // ── Spawn / Despawn ───────────────────────────────────────
  spawn() {
    if (!this.scene || !this.world) return;
    this.scene.add(this.group);
    if (this.body && this.mass > 0) this.world.addBody(this.body);
    else if (this.body && this.mass === 0) {
      this.body.type = CANNON.Body.STATIC;
      this.world.addBody(this.body);
    }
    this.active = true;
    this.setPosition(this.position.x, this.position.y, this.position.z);
    this.eventBus?.emit("entity_spawned", { entity: this });
  }

  despawn() {
    this.scene?.remove(this.group);
    if (this.body) this.world?.removeBody(this.body);
    this.active = false;
    this.eventBus?.emit("entity_despawned", { entity: this });
  }

  destroy() {
    this.despawn();
    this.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    this.onDestroyed?.(this);
    this.eventBus?.emit("entity_destroyed", { entity: this });
  }

  // ── Transformations ───────────────────────────────────────
  setPosition(x, y, z) {
    this.position = { x, y, z };
    this.group.position.set(x, y, z);
    if (this.body) this.body.position.set(x, y, z);
    this.updatedAt = Date.now();
    return this;
  }

  setRotation(x, y, z, w = 1) {
    this.rotation = { x, y, z, w };
    this.group.quaternion.set(x, y, z, w);
    if (this.body) this.body.quaternion.set(x, y, z, w);
    this.updatedAt = Date.now();
    return this;
  }

  setVelocity(x, y, z) {
    if (this.body) { this.body.velocity.set(x, y, z); this.body.wakeUp(); }
    return this;
  }

  applyImpulse(x, y, z) {
    if (this.body) { this.body.applyImpulse(new CANNON.Vec3(x, y, z)); this.body.wakeUp(); }
    return this;
  }

  setScale(s) {
    this.scale = s;
    this.group.scale.setScalar(s);
    return this;
  }

  setColor(hex) {
    this.color = hex;
    this.mesh?.material && (this.mesh.material.color = new THREE.Color(hex));
    return this;
  }

  setVisible(v) {
    this.visible = v;
    this.group.visible = v;
    return this;
  }

  // ── Santé ─────────────────────────────────────────────────
  damage(amount, source = null) {
    if (!this.active) return 0;
    this.health = Math.max(0, this.health - amount);
    this.eventBus?.emit("entity_damaged", { entity: this, amount, source, remaining: this.health });
    if (this.health <= 0) this.onDeath?.(source);
    return this.health;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health;
  }

  // ── Update loop ───────────────────────────────────────────
  update(deltaTime) {
    if (!this.active || !this.body) return;
    // Sync position Three.js ← Cannon-es
    this.group.position.copy(this.body.position);
    this.group.quaternion.copy(this.body.quaternion);
    this.position = { x: this.body.position.x, y: this.body.position.y, z: this.body.position.z };
  }

  // ── Serialisation ─────────────────────────────────────────
  toJSON() {
    return {
      id:        this.id,
      type:      this.type,
      name:      this.name,
      tags:      this.tags,
      active:    this.active,
      visible:   this.visible,
      position:  this.position,
      rotation:  this.rotation,
      scale:     this.scale,
      color:     this.color,
      mass:      this.mass,
      health:    this.health,
      maxHealth: this.maxHealth,
      metadata:  this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ════════════════════════════════════════════════════════════
//  ENTITY MANAGER — cerveau de la scène
// ════════════════════════════════════════════════════════════
export class EntityManager {
  #entities      = new Map();
  #entityClasses = new Map();
  #entityGroups  = new Map();
  #pendingSpawn  = [];
  #pendingDestroy = [];
  #updateCallbacks = [];

  constructor(scene, world, eventBus) {
    this.scene    = scene;
    this.world    = world;
    this.eventBus = eventBus || new EventBus();

    // Stats
    this.stats = { created:0, destroyed:0, active:0, updates:0 };

    // Register base entity
    this.registerEntityClass("base_entity", BaseEntity);

    console.log("[TroxTMod EntityManager] Initialisé");
  }

  // ── Enregistrement de classes ─────────────────────────────
  registerEntityClass(name, EntityClass) {
    this.#entityClasses.set(name, EntityClass);
    this.eventBus.emit("entity_class_registered", { name });
    console.log(`[TroxTMod] Classe enregistrée: ${name}`);
    return this;
  }

  registerMany(classes = {}) {
    Object.entries(classes).forEach(([name, cls]) => this.registerEntityClass(name, cls));
    return this;
  }

  hasClass(type) { return this.#entityClasses.has(type); }
  listClasses()  { return [...this.#entityClasses.keys()]; }

  // ── Création ──────────────────────────────────────────────
  createEntity(type, options = {}) {
    const EntityClass = this.#entityClasses.get(type);
    if (!EntityClass) throw new Error(`[TroxTMod] Type inconnu: "${type}". Disponibles: ${this.listClasses().join(", ")}`);

    const entity = new EntityClass({ ...options, type, eventBus: this.eventBus });
    entity.initialize(this.scene, this.world, this.eventBus);

    this.#entities.set(entity.id, entity);
    this.#indexTags(entity);

    this.stats.created++;
    this.stats.active++;

    this.eventBus.emit("entity_created", { entity, type });

    if (options.spawn !== false) entity.spawn();

    return entity;
  }

  // Spawn rapide avec position
  spawn(type, x = 0, y = 0, z = 0, options = {}) {
    return this.createEntity(type, { ...options, position: { x, y, z } });
  }

  // Spawn multiple
  spawnMany(items = []) {
    return items.map(({ type, x=0, y=0, z=0, ...opts }) => this.spawn(type, x, y, z, opts));
  }

  // ── Lecture ───────────────────────────────────────────────
  getEntity(id)              { return this.#entities.get(id) ?? null; }
  has(id)                    { return this.#entities.has(id); }
  all()                      { return [...this.#entities.values()]; }
  count()                    { return this.#entities.size; }
  byType(type)               { return this.all().filter(e => e.type === type); }
  byTag(tag)                 { return this.#entityGroups.has(tag) ? [...this.#entityGroups.get(tag)] : []; }
  byCategory(cat)            { return this.all().filter(e => e.category === cat); }
  active()                   { return this.all().filter(e => e.active); }

  // Recherche
  search(query) {
    const q = query.toLowerCase();
    return this.all().filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q) ||
      e.tags?.some(t => t.includes(q))
    );
  }

  nearest(position, maxDist = Infinity) {
    let best = null, bestDist = Infinity;
    const p = new THREE.Vector3(position.x, position.y, position.z);
    this.all().forEach(e => {
      if (!e.active) return;
      const ep = new THREE.Vector3(e.position.x, e.position.y, e.position.z);
      const d  = p.distanceTo(ep);
      if (d < bestDist && d <= maxDist) { bestDist = d; best = e; }
    });
    return best;
  }

  inRadius(position, radius) {
    const p = new THREE.Vector3(position.x, position.y, position.z);
    return this.all().filter(e => {
      if (!e.active) return false;
      const ep = new THREE.Vector3(e.position.x, e.position.y, e.position.z);
      return p.distanceTo(ep) <= radius;
    });
  }

  // ── Mise à jour ───────────────────────────────────────────
  updateEntity(id, updates = {}) {
    const entity = this.#entities.get(id);
    if (!entity) throw new Error(`Entity not found: ${id}`);

    if (updates.position) entity.setPosition(updates.position.x, updates.position.y, updates.position.z);
    if (updates.rotation) entity.setRotation(updates.rotation.x, updates.rotation.y, updates.rotation.z, updates.rotation.w || 1);
    if (updates.velocity && entity.body) entity.setVelocity(updates.velocity.x, updates.velocity.y, updates.velocity.z);
    if (updates.color)   entity.setColor(updates.color);
    if (updates.scale)   entity.setScale(updates.scale);
    if (updates.visible !== undefined) entity.setVisible(updates.visible);
    if (updates.active  !== undefined) updates.active ? entity.spawn() : entity.despawn();
    if (updates.health  !== undefined) entity.health = Math.max(0, Math.min(entity.maxHealth, updates.health));
    if (updates.metadata) Object.assign(entity.metadata, updates.metadata);

    entity.updatedAt = Date.now();
    this.eventBus.emit("entity_updated", { entity, updates });
    return entity;
  }

  // Appliquer à plusieurs
  updateMany(ids = [], updates = {}) {
    return ids.map(id => { try { return this.updateEntity(id, updates); } catch { return null; } }).filter(Boolean);
  }

  // Appliquer à tous d'un type
  updateByType(type, updates = {}) {
    return this.byType(type).map(e => this.updateEntity(e.id, updates));
  }

  // ── Suppression ───────────────────────────────────────────
  removeEntity(id) {
    const entity = this.#entities.get(id);
    if (!entity) return false;
    entity.destroy();
    this.#unindexTags(entity);
    this.#entities.delete(id);
    this.stats.destroyed++;
    this.stats.active = Math.max(0, this.stats.active - 1);
    this.eventBus.emit("entity_removed", { entityId: id });
    return true;
  }

  removeByType(type) {
    const removed = this.byType(type).map(e => this.removeEntity(e.id));
    return removed.filter(Boolean).length;
  }

  clearAll() {
    this.#entities.forEach(e => e.destroy());
    this.#entities.clear();
    this.#entityGroups.clear();
    this.stats.active = 0;
    this.eventBus.emit("entities_cleared");
    console.log("[TroxTMod] Toutes les entités supprimées");
  }

  // ── Game Loop ─────────────────────────────────────────────
  update(deltaTime) {
    this.stats.updates++;

    // Update toutes les entités actives
    this.#entities.forEach(e => {
      if (e.active && e.update) e.update(deltaTime);
    });

    // Spawn en attente
    while (this.#pendingSpawn.length > 0) {
      this.#pendingSpawn.shift()?.spawn();
    }

    // Destroy en attente
    while (this.#pendingDestroy.length > 0) {
      this.removeEntity(this.#pendingDestroy.shift());
    }

    // Callbacks custom
    this.#updateCallbacks.forEach(cb => cb(deltaTime, this));
  }

  onUpdate(cb) { this.#updateCallbacks.push(cb); return this; }

  // ── Raycasting ────────────────────────────────────────────
  raycast(origin, direction, maxDistance = 1000, filter = null) {
    const raycaster = new THREE.Raycaster();
    raycaster.set(
      new THREE.Vector3(origin.x, origin.y, origin.z),
      new THREE.Vector3(direction.x, direction.y, direction.z).normalize()
    );
    raycaster.far = maxDistance;

    const meshes = [];
    this.#entities.forEach(e => {
      if (!e.active || !e.mesh) return;
      if (filter && !filter(e)) return;
      meshes.push(e.mesh);
    });

    const hits = raycaster.intersectObjects(meshes, true);
    return hits.map(hit => {
      const entity = this.#findEntityByMesh(hit.object);
      return entity ? { entity, distance: hit.distance, point: hit.point, normal: hit.face?.normal } : null;
    }).filter(Boolean).sort((a, b) => a.distance - b.distance);
  }

  #findEntityByMesh(mesh) {
    let obj = mesh;
    while (obj) {
      if (obj.userData?.entityId) return this.#entities.get(obj.userData.entityId) ?? null;
      obj = obj.parent;
    }
    return null;
  }

  // ── Index tags ────────────────────────────────────────────
  #indexTags(entity) {
    (entity.tags || []).forEach(tag => {
      if (!this.#entityGroups.has(tag)) this.#entityGroups.set(tag, new Set());
      this.#entityGroups.get(tag).add(entity);
    });
  }

  #unindexTags(entity) {
    (entity.tags || []).forEach(tag => this.#entityGroups.get(tag)?.delete(entity));
  }

  // ── Serialisation / Persistance ───────────────────────────
  serialize() { return this.all().map(e => e.toJSON()); }

  deserialize(data = []) {
    return data.map(d => {
      const EntityClass = this.#entityClasses.get(d.type);
      if (!EntityClass) { console.warn(`[TroxTMod] Type inconnu lors du chargement: ${d.type}`); return null; }
      return this.createEntity(d.type, d);
    }).filter(Boolean);
  }

  exportToJSON()      { return JSON.stringify(this.serialize(), null, 2); }
  importFromJSON(str) { return this.deserialize(JSON.parse(str)); }

  // Sync avec le serveur TroxTMod
  async syncWithServer(baseUrl = "http://localhost:3000") {
    try {
      const res  = await fetch(`${baseUrl}/troxtmod/world`);
      const data = await res.json();
      if (data.success) {
        console.log(`[TroxTMod] Sync: ${data.world.entities?.length ?? 0} entités`);
        return data.world;
      }
    } catch (err) {
      console.error("[TroxTMod] Sync échoué:", err.message);
    }
    return null;
  }

  async pushToServer(baseUrl = "http://localhost:3000") {
    try {
      const entities = this.serialize();
      const res = await fetch(`${baseUrl}/troxtmod/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entities }),
      });
      return await res.json();
    } catch (err) {
      console.error("[TroxTMod] Push échoué:", err.message);
      return null;
    }
  }

  // ── Debug ─────────────────────────────────────────────────
  getStats() {
    return {
      ...this.stats,
      total:    this.#entities.size,
      classes:  this.listClasses().length,
      groups:   this.#entityGroups.size,
    };
  }

  debug() {
    console.group("[TroxTMod EntityManager] Debug");
    console.log("Stats:", this.getStats());
    console.log("Entités:", this.all().map(e => `${e.id} (${e.type})`));
    console.log("Classes:", this.listClasses());
    console.groupEnd();
    return this;
  }
}

export default EntityManager;
