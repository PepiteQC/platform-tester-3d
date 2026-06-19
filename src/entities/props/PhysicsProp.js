// src/entities/props/PhysicsProp.js
import { BaseEntity } from "../BaseEntity.js";
import { bus } from "../../systems/EventBus.js";

export class PhysicsProp extends BaseEntity {
  static type     = "physics_prop";
  static category = "prop";

  onInit(data) {
    this.mass        = Number(data.mass        ?? 1);       // kg
    this.friction    = Number(data.friction    ?? 0.5);
    this.restitution = Number(data.restitution ?? 0.3);     // bounce
    this.isKinematic = Boolean(data.isKinematic ?? false);
    this.velocity    = [0, 0, 0];
    this.angularVel  = [0, 0, 0];
    this.sleeping    = false;
  }

  applyImpulse(force = [0, 0, 0]) {
    this.velocity  = this.velocity.map((v, i) => v + (force[i] ?? 0) / this.mass);
    this.sleeping  = false;
    this.updatedAt = new Date().toISOString();
    bus.emit("physics:impulse", { entity: this, force });
    return this;
  }

  sleep()  { this.sleeping = true;  bus.emit("physics:sleep",  { entity: this }); }
  wake()   { this.sleeping = false; bus.emit("physics:wake",   { entity: this }); }

  toJSON() {
    return {
      ...super.toJSON(),
      mass:        this.mass,
      friction:    this.friction,
      restitution: this.restitution,
      isKinematic: this.isKinematic,
      velocity:    this.velocity,
      angularVel:  this.angularVel,
      sleeping:    this.sleeping,
    };
  }
}