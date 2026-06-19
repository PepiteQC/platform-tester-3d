// ════════════════════════════════════════════════════════════
//  TroxTMod PhysicsProp — Bolt module integre
//  Base class pour tous les objets physiques
//  Three.js + Cannon-es
// ════════════════════════════════════════════════════════════

import * as THREE  from "three";
import * as CANNON from "cannon-es";
import { BaseEntity } from "./EntityManager.js";

export class PhysicsProp extends BaseEntity {
  static ENTITY_TYPE = "physics_prop";

  constructor(options = {}) {
    super(options);
    this.mass                 = options.mass                ?? 1;
    this.restitution          = options.restitution         ?? 0.3;
    this.friction             = options.friction            ?? 0.5;
    this.linearDamping        = options.linearDamping       ?? 0.01;
    this.angularDamping       = options.angularDamping      ?? 0.01;
    this.collisionFilterGroup = options.collisionFilterGroup ?? 1;
    this.collisionFilterMask  = options.collisionFilterMask  ?? -1;
    this.fixedRotation        = options.fixedRotation       || false;
    this.isTrigger            = options.isTrigger           || false;
    this.velocity             = options.velocity            || { x:0, y:0, z:0 };
    this.angularVelocity      = options.angularVelocity     || { x:0, y:0, z:0 };

    // Callbacks evenements
    this._listeners = new Map();
  }

  // ── EventEmitter minimal ──────────────────────────────────
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
    return this;
  }

  emit(event, data) {
    (this._listeners.get(event) || []).forEach(fn => { try { fn(data); } catch(e) { console.warn(e); } });
    this.eventBus?.emit(event, { entity: this, ...data });
    return this;
  }

  // ── Geometry — a surcharger dans les sous-classes ─────────
  getGeometry() {
    return new THREE.BoxGeometry(1, 1, 1);
  }

  // ── Material Three.js ─────────────────────────────────────
  createMaterial() {
    return new THREE.MeshStandardMaterial({
      color:     new THREE.Color(this.color || "#888888"),
      roughness: 0.7,
      metalness: 0.3,
    });
  }

  // ── Shape Cannon-es ───────────────────────────────────────
  createShape() {
    return new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
  }

  // ── Mesh Three.js ─────────────────────────────────────────
  createMesh() {
    const geo = this.getGeometry();
    const mat = this.createMaterial();
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.quaternion.set(this.rotation.x, this.rotation.y, this.rotation.z, this.rotation.w);
    this.mesh.scale.setScalar(this.scale);
    this.mesh.castShadow    = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.entity   = this;
    this.mesh.userData.entityId = this.id;

    // Bords lumineux
    const edges = new THREE.EdgesGeometry(geo);
    const color = new THREE.Color(this.color || "#888888");
    this.mesh.add(new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(1.5), transparent: true, opacity: 0.3 })
    ));

    this.group.add(this.mesh);
    return this.mesh;
  }

  // ── Corps physique Cannon-es ──────────────────────────────
  createBody() {
    const shape    = this.createShape();
    const material = new CANNON.Material("prop_material");
    material.friction    = this.friction;
    material.restitution = this.restitution;

    const body = new CANNON.Body({
      mass:                 this.mass,
      material,
      position:             new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
      quaternion:           new CANNON.Quaternion(this.rotation.x, this.rotation.y, this.rotation.z, this.rotation.w),
      linearDamping:        this.linearDamping,
      angularDamping:       this.angularDamping,
      collisionFilterGroup: this.collisionFilterGroup,
      collisionFilterMask:  this.collisionFilterMask,
      fixedRotation:        this.fixedRotation,
    });

    body.addShape(shape);
    body.userData = { entity: this, entityId: this.id };

    if (this.isTrigger) {
      body.collisionResponse = false;
      body.addEventListener("collide", e => this.onTrigger(e));
    } else {
      body.addEventListener("collide", e => this.onCollision(e));
    }

    this.body        = body;
    this.physicsBody = body;

    if (this.velocity.x || this.velocity.y || this.velocity.z) {
      body.velocity.set(this.velocity.x, this.velocity.y, this.velocity.z);
    }

    return body;
  }

  // ── Callbacks collision ───────────────────────────────────
  onCollision(event) {
    this.emit("collision", {
      body:           event.body,
      contact:        event.contact,
      impactVelocity: event.contact.getImpactVelocityAlongNormal(),
    });
  }

  onTrigger(event) {
    this.emit("trigger", {
      body:   event.body,
      entity: event.body?.userData?.entity,
    });
  }

  // ── Forces ────────────────────────────────────────────────
  applyForce(force, worldPoint) {
    if (!this.body) return this;
    const pt = worldPoint || this.body.position;
    this.body.applyForce(
      new CANNON.Vec3(force.x, force.y, force.z),
      new CANNON.Vec3(pt.x,    pt.y,    pt.z)
    );
    return this;
  }

  applyImpulse(impulse, worldPoint) {
    if (!this.body) return this;
    const pt = worldPoint || this.body.position;
    this.body.applyImpulse(
      new CANNON.Vec3(impulse.x, impulse.y, impulse.z),
      new CANNON.Vec3(pt.x,      pt.y,      pt.z)
    );
    return this;
  }

  applyTorque(torque) {
    if (!this.body) return this;
    this.body.applyTorque(new CANNON.Vec3(torque.x, torque.y, torque.z));
    return this;
  }

  // ── Vitesse ───────────────────────────────────────────────
  setVelocity(vx, vy, vz) {
    this.velocity = { x:vx, y:vy, z:vz };
    if (this.body) { this.body.velocity.set(vx, vy, vz); this.body.wakeUp(); }
    return this;
  }

  addVelocity(vx, vy, vz) {
    if (this.body) {
      this.body.velocity.x += vx;
      this.body.velocity.y += vy;
      this.body.velocity.z += vz;
      this.body.wakeUp();
    }
    return this;
  }

  // ── Freeze / Unfreeze ─────────────────────────────────────
  freeze() {
    if (this.body) { this.body.type = CANNON.Body.STATIC; this.body.updateMassProperties(); }
    this.emit("frozen", { entity: this });
    return this;
  }

  unfreeze() {
    if (this.body) { this.body.type = CANNON.Body.DYNAMIC; this.body.updateMassProperties(); this.body.wakeUp(); }
    this.emit("unfrozen", { entity: this });
    return this;
  }

  isFrozen() { return this.body?.type === CANNON.Body.STATIC; }

  // ── Couleur ───────────────────────────────────────────────
  setColor(r, g, b) {
    const color = typeof g === "number"
      ? new THREE.Color(r, g, b)
      : new THREE.Color(r);
    this.color = "#" + color.getHexString();
    if (this.mesh?.material) {
      this.mesh.material.color = color;
      this.metadata.color = { r: color.r, g: color.g, b: color.b };
    }
    return this;
  }

  // ── Scale ─────────────────────────────────────────────────
  setScale(s) {
    this.scale = s;
    if (this.mesh) this.mesh.scale.setScalar(s);
    return this;
  }

  // ── Update loop — sync Three.js ← Cannon-es ──────────────
  update(deltaTime) {
    if (!this.active || !this.body) return;
    this.group.position.copy(this.body.position);
    this.group.quaternion.copy(this.body.quaternion);
    this.position = { x: this.body.position.x, y: this.body.position.y, z: this.body.position.z };
    this.velocity = { x: this.body.velocity.x,  y: this.body.velocity.y,  z: this.body.velocity.z  };
  }

  // ── Serialisation ─────────────────────────────────────────
  toJSON() {
    return {
      ...super.toJSON(),
      mass:         this.mass,
      restitution:  this.restitution,
      friction:     this.friction,
      isTrigger:    this.isTrigger,
      fixedRotation: this.fixedRotation,
      velocity: this.body
        ? { x: this.body.velocity.x, y: this.body.velocity.y, z: this.body.velocity.z }
        : this.velocity,
    };
  }
}

export default PhysicsProp;
