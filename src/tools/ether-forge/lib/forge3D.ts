// ============================================================
//  forge3D — Moteur 3D principal
// ============================================================

import type { ForgeObject, ForgeScene } from '../types'

export class Forge3D {
  private renderer: unknown = null
  private scene: unknown = null
  private camera: unknown = null

  // TODO: Initialiser Three.js
  async init(_canvas: HTMLCanvasElement): Promise<void> {}

  // TODO: Charger une scène
  async loadScene(_scene: ForgeScene): Promise<void> {}

  // TODO: Ajouter un objet 3D
  async addMesh(_object: ForgeObject): Promise<void> {}

  // TODO: Supprimer un objet
  removeMesh(_id: string): void {}

  // TODO: Boucle de rendu
  startRenderLoop(): void {}
  stopRenderLoop(): void {}

  // TODO: Screenshot
  takeScreenshot(): string { return '' }

  // TODO: Dispose
  dispose(): void {}
}

export const forge3D = new Forge3D()
export default Forge3D