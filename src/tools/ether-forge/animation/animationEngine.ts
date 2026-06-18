// ============================================================
// 🎬 ANIMATION ENGINE — 10 types d'animations fluides
// rotate · float · pulse · orbit · path · shake · bounce
// wave · spiral · pendulum
// ============================================================

import * as THREE from 'three'
import type { ForgeAnimation, AnimationType } from '../types/index.js'

// ─────────────────────────────────────────────
// HANDLERS PAR TYPE
// ─────────────────────────────────────────────
type AnimHandler = (
  target:  THREE.Object3D,
  delta:   number,
  elapsed: number,
  anim:    ForgeAnimation
) => void

const HANDLERS: Record<AnimationType, AnimHandler> = {

  rotate: (target, delta, _elapsed, anim) => {
    const s    = anim.speed ?? 1
    const axis = anim.axis  ?? 'y'
    if (axis === 'x' || axis === 'all') target.rotation.x += delta * s
    if (axis === 'y' || axis === 'all') target.rotation.y += delta * s * 0.8
    if (axis === 'z' || axis === 'all') target.rotation.z += delta * s * 0.5
  },

  float: (target, delta, elapsed, anim) => {
    const s   = anim.speed     ?? 1
    const amp = anim.amplitude ?? 0.3
    const t   = elapsed * s + (anim.delay ?? 0)
    target.position.y += Math.sin(t * 2) * amp * delta
  },

  pulse: (target, _delta, elapsed, anim) => {
    const s   = anim.speed     ?? 1
    const amp = anim.amplitude ?? 0.1
    const t   = elapsed * s + (anim.delay ?? 0)
    const scale = 1 + Math.sin(t * 3) * amp
    target.scale.set(scale, scale, scale)
  },

  orbit: (target, _delta, elapsed, anim) => {
    const s      = anim.speed          ?? 1
    const radius = anim.params?.radius ?? 3
    const t      = elapsed * s + (anim.delay ?? 0)
    target.position.x = Math.cos(t) * radius
    target.position.z = Math.sin(t) * radius
  },

  path: (target, _delta, elapsed, anim) => {
    const path = anim.params?.path
    if (!path || path.length < 2) return
    const s          = anim.speed ?? 0.2
    const t          = (elapsed * s + (anim.delay ?? 0)) % 1
    const totalSteps = path.length - 1
    const floatIdx   = t * totalSteps
    const idx        = Math.floor(floatIdx)
    const next       = Math.min(idx + 1, totalSteps)
    const lerp       = floatIdx % 1
    target.position.lerpVectors(
      new THREE.Vector3(path[idx].x,  path[idx].y,  path[idx].z),
      new THREE.Vector3(path[next].x, path[next].y, path[next].z),
      lerp
    )
  },

  shake: (target, _delta, elapsed, anim) => {
    const amp = (anim.amplitude ?? 0.05) * Math.exp(-elapsed * 0.5)
    target.position.x += (Math.random() - 0.5) * amp
    target.position.y += (Math.random() - 0.5) * amp
    target.position.z += (Math.random() - 0.5) * amp
  },

  bounce: (target, _delta, elapsed, anim) => {
    const s   = anim.speed     ?? 1
    const amp = anim.amplitude ?? 1
    const t   = elapsed * s + (anim.delay ?? 0)
    target.position.y = Math.abs(Math.sin(t * Math.PI)) * amp
  },

  wave: (target, _delta, elapsed, anim) => {
    const s    = anim.speed           ?? 1
    const amp  = anim.amplitude       ?? 0.2
    const freq = anim.params?.frequency ?? 2
    const t    = elapsed * s + (anim.delay ?? 0)
    target.rotation.z  = Math.sin(t * freq) * amp
    target.position.y  = Math.cos(t * freq * 0.7) * amp * 0.5
  },

  spiral: (target, _delta, elapsed, anim) => {
    const s      = anim.speed          ?? 0.5
    const radius = anim.params?.radius ?? 3
    const t      = elapsed * s + (anim.delay ?? 0)
    target.position.x  = Math.cos(t) * radius * (1 - (t * 0.01) % 1)
    target.position.z  = Math.sin(t) * radius * (1 - (t * 0.01) % 1)
    target.position.y += 0.001 * s
  },

  pendulum: (target, _delta, elapsed, anim) => {
    const s    = anim.speed             ?? 1
    const amp  = anim.amplitude         ?? 0.5
    const damp = anim.params?.damping   ?? 0.98
    const t    = elapsed * s + (anim.delay ?? 0)
    target.rotation.z = Math.sin(t * 2) * amp * Math.pow(damp, elapsed)
  },
}

// ─────────────────────────────────────────────
// CLASSE PRINCIPALE
// ─────────────────────────────────────────────
export class AnimationEngine {
  private animations: ForgeAnimation[] = []

  add(anim: ForgeAnimation): void {
    this.animations.push(anim)
  }

  remove(target: THREE.Object3D): void {
    this.animations = this.animations.filter(a => a.target !== target)
  }

  pause(target: THREE.Object3D): void {
    this.animations
      .filter(a => a.target === target)
      .forEach(a => { a.paused = true })
  }

  resume(target: THREE.Object3D): void {
    this.animations
      .filter(a => a.target === target)
      .forEach(a => { a.paused = false })
  }

  update(delta: number, elapsed: number): void {
    for (const anim of this.animations) {
      if (!anim.target || anim.paused) continue
      const handler = HANDLERS[anim.type]
      if (!handler) continue
      try {
        handler(anim.target, delta, elapsed + (anim.delay ?? 0), anim)
      } catch (err) {
        console.warn(`AnimationEngine: erreur "${anim.type}"`, err)
      }
    }
  }

  clear(): void {
    this.animations = []
  }

  getStats() {
    return {
      total:  this.animations.length,
      active: this.animations.filter(a => !a.paused).length,
      paused: this.animations.filter(a =>  a.paused).length,
      types:  [...new Set(this.animations.map(a => a.type))],
    }
  }
}

export const animationEngine = new AnimationEngine()