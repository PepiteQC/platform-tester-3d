// src/entities/addons/TriggerZone.js
import { BaseEntity } from "../BaseEntity.js";
import { bus } from "../../systems/EventBus.js";

export class TriggerZone extends BaseEntity {
  static type     = "trigger_zone";
  static category = "addon";

  onInit(data) {
    this.shape      = String(data.shape   || "box");   // box | sphere | cylinder
    this.radius     = Number(data.radius  || 3);       // pour sphere/cylinder
    this.onEnter    = String(data.onEnter || "none");  // event à émettre
    this.onLeave    = String(data.onLeave || "none");
    this.oneShot    = Boolean(data.oneShot ?? false);  // se désactive après 1 trigger
    this.active     = true;
    this.#inside    = new Set();
  }

  #inside = new Set();

  // Appelé par le server tick ou le client
  checkPlayer(playerId, playerPos) {
    if (!this.active) return;

    const inside = this.#isInside(playerPos);
    const was    = this.#inside.has(playerId);

    if (inside && !was) {
      this.#inside.add(playerId);
      bus.emit("trigger:enter", { zone: this, playerId });
      if (this.onEnter !== "none") bus.emit(this.onEnter, { zone: this, playerId });
      if (this.oneShot) this.active = false;
    }

    if (!inside && was) {
      this.#inside.delete(playerId);
      bus.emit("trigger:leave", { zone: this, playerId });
      if (this.onLeave !== "none") bus.emit(this.onLeave, { zone: this, playerId });
    }
  }

  #isInside(pos) {
    const [px, py, pz] = pos;
    const [ex, ey, ez] = this.position;

    if (this.shape === "sphere") {
      const dx = px-ex, dy = py-ey, dz = pz-ez;
      return Math.sqrt(dx*dx + dy*dy + dz*dz) <= this.radius;
    }

    // box par défaut
    const [sx, sy, sz] = this.size;
    return Math.abs(px-ex) <= sx/2
        && Math.abs(py-ey) <= sy/2
        && Math.abs(pz-ez) <= sz/2;
  }

  getPlayers() { return [...this.#inside]; }

  toJSON() {
    return {
      ...super.toJSON(),
      shape:   this.shape,
      radius:  this.radius,
      onEnter: this.onEnter,
      onLeave: this.onLeave,
      oneShot: this.oneShot,
      active:  this.active,
      inside:  this.getPlayers(),
    };
  }
}