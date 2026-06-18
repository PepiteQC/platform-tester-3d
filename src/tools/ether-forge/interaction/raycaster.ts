// ============================================================
// 🎯 RAYCASTER — Interactions optimisées
// Hover · Click · Double-click
// ============================================================

import * as THREE from 'three'

export interface RaycastHit {
  object:      THREE.Object3D
  point:       THREE.Vector3
  distance:    number
  face?:       THREE.Face | null
  instanceId?: number
}

export class ForgeRaycaster {
  private raycaster = new THREE.Raycaster()
  private pointer   = new THREE.Vector2()
  private camera:   THREE.Camera
  private canvas:   HTMLCanvasElement
  private targets:  THREE.Object3D[] = []
  private hovered:  THREE.Object3D | null = null

  onHover?:       (hit: RaycastHit | null) => void
  onClick?:       (hit: RaycastHit) => void
  onDoubleClick?: (hit: RaycastHit) => void

  constructor(camera: THREE.Camera, canvas: HTMLCanvasElement) {
    this.camera = camera
    this.canvas = canvas
    this.setupEvents()
  }

  setTargets(objects: THREE.Object3D[]): void {
    this.targets = objects
  }

  addTarget(object: THREE.Object3D): void {
    if (!this.targets.includes(object)) {
      this.targets.push(object)
    }
  }

  removeTarget(object: THREE.Object3D): void {
    this.targets = this.targets.filter(o => o !== object)
  }

  cast(recursive = false): RaycastHit[] {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const meshes = this.targets.filter(
      o => o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh
    )
    return this.raycaster
      .intersectObjects(meshes, recursive)
      .map(hit => ({
        object:     hit.object,
        point:      hit.point.clone(),
        distance:   hit.distance,
        face:       hit.face,
        instanceId: hit.instanceId,
      }))
  }

  updateHover(): void {
    const hits    = this.cast()
    const current = hits.length > 0 ? hits[0].object : null

    if (current !== this.hovered) {
      this.hovered              = current
      this.canvas.style.cursor  = current ? 'pointer' : 'default'
      if (this.onHover) this.onHover(hits.length > 0 ? hits[0] : null)
    }
  }

  private setupEvents(): void {
    this.canvas.addEventListener('pointermove', (e) => {
      this.updatePointer(e)
    })

    this.canvas.addEventListener('click', (e) => {
      this.updatePointer(e)
      const hits = this.cast()
      if (hits.length > 0 && this.onClick) this.onClick(hits[0])
    })

    this.canvas.addEventListener('dblclick', (e) => {
      this.updatePointer(e)
      const hits = this.cast()
      if (hits.length > 0 && this.onDoubleClick) this.onDoubleClick(hits[0])
    })
  }

  private updatePointer(e: PointerEvent | MouseEvent): void {
    const rect        = this.canvas.getBoundingClientRect()
    this.pointer.x    =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
    this.pointer.y    = -((e.clientY - rect.top)  / rect.height) * 2 + 1
  }

  getHovered(): THREE.Object3D | null { return this.hovered }
}