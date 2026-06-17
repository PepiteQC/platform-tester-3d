// ============================================================
//  forgeExport — Export 3D (GLTF, OBJ, FBX...)
// ============================================================

import type { ForgeScene, ForgeExportOptions } from '../types'

export class ForgeExport {
  // TODO: Exporter en GLTF
  async toGLTF(_scene: ForgeScene, _options?: Partial<ForgeExportOptions>): Promise<Blob | null> {
    return null
  }

  // TODO: Exporter en GLB (binaire)
  async toGLB(_scene: ForgeScene): Promise<Blob | null> { return null }

  // TODO: Exporter en OBJ
  async toOBJ(_scene: ForgeScene): Promise<string> { return '' }

  // TODO: Télécharger le fichier
  download(_blob: Blob, _filename: string): void {}

  // TODO: Importer un fichier
  async import(_file: File): Promise<ForgeScene | null> { return null }
}

export const forgeExport = new ForgeExport()
export default ForgeExport