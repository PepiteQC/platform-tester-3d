// src/entities/props/StaticProp.js
import { BaseEntity } from "../BaseEntity.js";

export class StaticProp extends BaseEntity {
  static type     = "static_prop";
  static category = "prop";

  onInit(data) {
    this.castShadow    = Boolean(data.castShadow    ?? true);
    this.receiveShadow = Boolean(data.receiveShadow ?? true);
    this.collider      = String(data.collider       || "box"); // box | sphere | mesh | none
  }

  toJSON() {
    return {
      ...super.toJSON(),
      castShadow:    this.castShadow,
      receiveShadow: this.receiveShadow,
      collider:      this.collider,
    };
  }
}