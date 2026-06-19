import { BaseEntity } from "../BaseEntity.js";
import { bus } from "../../systems/EventBus.js";

export class TriggerZone extends BaseEntity {
  static type     = "trigger_zone";
  static category = "addon";

  onInit(data) {
    this.shape   = String(data.shape   || "box");
    this.radius  = Number(data.radius  || 3);
    this.onEnter = String(data.onEnter || "none");
    this.onLeave = String(data.onLeave || "none");
    this.oneShot = Boolean(data.oneShot ?? false);
    this.active  = true;
    this._inside = new Set();
  }

  checkPlayer(playerId, playerPos) {
    if (!this.active) return;
    const inside = this._isInside(playerPos);
    const was    = this._inside.has(playerId);
    if (inside && !was) { this._inside.add(playerId); bus.emit("trigger:enter", { zone: this, playerId }); if (this.onEnter !== "none") bus.emit(this.onEnter, { zone: this, playerId }); if (this.oneShot) this.active = false; }
    if (!inside && was) { this._inside.delete(playerId); bus.emit("trigger:leave", { zone: this, playerId }); if (this.onLeave !== "none") bus.emit(this.onLeave, { zone: this, playerId }); }
  }

  _isInside(pos) {
    const [px,py,pz] = pos;
    const [ex,ey,ez] = this.position;
    if (this.shape === "sphere") { return Math.sqrt((px-ex)**2+(py-ey)**2+(pz-ez)**2) <= this.radius; }
    const [sx,sy,sz] = this.size;
    return Math.abs(px-ex)<=sx/2 && Math.abs(py-ey)<=sy/2 && Math.abs(pz-ez)<=sz/2;
  }

  getPlayers() { return [...this._inside]; }

  toJSON() {
    return { ...super.toJSON(), shape: this.shape, radius: this.radius, onEnter: this.onEnter, onLeave: this.onLeave, oneShot: this.oneShot, active: this.active, inside: this.getPlayers() };
  }
}
