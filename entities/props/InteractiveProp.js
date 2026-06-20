import { BaseEntity } from "../BaseEntity.js";
import { bus } from "../../systems/EventBus.js";

export class InteractiveProp extends BaseEntity {
  static type     = "interactive_prop";
  static category = "prop";

  onInit(data) {
    this.interactive = true;
    this.prompt      = String(data.prompt     || "Appuyer sur E");
    this.cooldownMs  = Number(data.cooldownMs ?? 1000);
    this.useCount    = 0;
    this.maxUses     = Number(data.maxUses    ?? -1);
    this.action      = String(data.action     || "none");
    this.payload     = data.payload ?? {};
    this._lastUsed   = 0;
  }

  interact(playerId) {
    const now = Date.now();
    if (now - this._lastUsed < this.cooldownMs) return { ok: false, reason: "cooldown" };
    if (this.maxUses > 0 && this.useCount >= this.maxUses) return { ok: false, reason: "exhausted" };
    this._lastUsed = now;
    this.useCount++;
    this.updatedAt = new Date().toISOString();
    bus.emit("prop:interacted", { entity: this, playerId, useCount: this.useCount });
    return { ok: true, action: this.action, payload: this.payload, useCount: this.useCount };
  }

  toJSON() {
    return { ...super.toJSON(), interactive: this.interactive, prompt: this.prompt, cooldownMs: this.cooldownMs, useCount: this.useCount, maxUses: this.maxUses, action: this.action, payload: this.payload };
  }
}
