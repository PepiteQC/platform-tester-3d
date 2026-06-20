import { BaseEntity } from "../BaseEntity.js";
import { bus } from "../../systems/EventBus.js";

export class NpcEntity extends BaseEntity {
  static type     = "npc";
  static category = "addon";

  onInit(data) {
    this.displayName = String(data.displayName || "NPC");
    this.role        = String(data.role        || "civilian");
    this.dialogue    = Array.isArray(data.dialogue) ? data.dialogue : ["..."];
    this.dialogueIdx = 0;
    this.state       = "idle";
    this.health      = Number(data.health    ?? 100);
    this.maxHealth   = Number(data.maxHealth ?? 100);
    this.speed       = Number(data.speed     ?? 2);
    this.aggroRange  = Number(data.aggroRange ?? 0);
    this.waypoints   = Array.isArray(data.waypoints) ? data.waypoints : [];
    this._wpIndex    = 0;
  }

  talk(playerId) {
    const line = this.dialogue[this.dialogueIdx % this.dialogue.length];
    this.dialogueIdx++;
    this.state = "talking";
    bus.emit("npc:talk", { npc: this, playerId, line });
    return { ok: true, line, speaker: this.displayName };
  }

  damage(amount, source = null) {
    this.health = Math.max(0, this.health - amount);
    bus.emit("npc:damaged", { npc: this, amount, source, remaining: this.health });
    if (this.health <= 0) { this.state = "dead"; bus.emit("npc:died", { npc: this, source }); }
    return this.health;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health;
  }

  tick(deltaMs) {
    if (this.state === "dead" || this.waypoints.length === 0) return;
    const target = this.waypoints[this._wpIndex % this.waypoints.length];
    const speed  = this.speed * (deltaMs / 1000);
    const dx = target[0] - this.position[0];
    const dz = target[2] - this.position[2];
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < 0.3) { this._wpIndex++; }
    else { this.position[0] += (dx/dist)*speed; this.position[2] += (dz/dist)*speed; this.state = "walking"; this.updatedAt = new Date().toISOString(); }
  }

  toJSON() {
    return { ...super.toJSON(), displayName: this.displayName, role: this.role, state: this.state, health: this.health, maxHealth: this.maxHealth, speed: this.speed, aggroRange: this.aggroRange, waypoints: this.waypoints };
  }
}
