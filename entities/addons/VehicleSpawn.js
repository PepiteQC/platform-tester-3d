import { BaseEntity } from "../BaseEntity.js";

export class VehicleSpawn extends BaseEntity {
  static type     = "vehicle_spawn";
  static category = "addon";

  onInit(data) {
    this.vehicleModel = String(data.vehicleModel || "sedan");
    this.respawnMs    = Number(data.respawnMs    || 30000);
    this.maxVehicles  = Number(data.maxVehicles  || 1);
    this.spawnedCount = 0;
  }

  toJSON() {
    return { ...super.toJSON(), vehicleModel: this.vehicleModel, respawnMs: this.respawnMs, spawnedCount: this.spawnedCount };
  }
}
