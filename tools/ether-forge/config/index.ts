// ============================================================
// ⚙️ FORGE3D CONFIG — Tout réglé en un seul endroit
// ============================================================

import type { ForgeConfig } from '../types/index.js'

export const FORGE_CONFIG: ForgeConfig = {
  // ─── RENDERER ──────────────────────────────────────────
  antialias:        true,
  pixelRatio:       Math.min(window.devicePixelRatio, 2),
  toneMapping:      'ACESFilmic',
  exposure:         1.0,

  // ─── OMBRES ────────────────────────────────────────────
  shadows:          true,
  shadowMapSize:    2048,

  // ─── BLOOM ─────────────────────────────────────────────
  bloom:            true,
  bloomStrength:    0.3,
  bloomRadius:      0.5,
  bloomThreshold:   0.1,

  // ─── SSAO ──────────────────────────────────────────────
  ssao:             true,
  ssaoKernelRadius: 0.5,

  // ─── FOG ───────────────────────────────────────────────
  fogEnabled:       true,
  fogDensity:       0.008,
  fogColor:         0x111122,

  // ─── PERFORMANCES ──────────────────────────────────────
  maxInstances:     10_000,
  lodDistances:     [5, 15, 50],
  fpsTarget:        60,
  autoDispose:      true,
}

// ─────────────────────────────────────────────
// ÉCLAIRAGE PAR DÉFAUT
// ─────────────────────────────────────────────
export const LIGHTING_CONFIG = {
  ambient: {
    color:     0x404060,
    intensity: 0.5,
  },
  hemisphere: {
    skyColor:    0x87ceeb,
    groundColor: 0x362d59,
    intensity:   0.6,
  },
  sun: {
    color:     0xffeedd,
    intensity: 2,
    position:  { x: 20, y: 30, z: 10 },
    shadow: {
      mapSize:  2048,
      near:     0.1,
      far:      80,
      area:     30,
      bias:     -0.001,
    },
  },
  fill: {
    color:     0x4488ff,
    intensity: 0.4,
    position:  { x: -10, y: 5, z: -10 },
  },
  rim: {
    color:     0xff6644,
    intensity: 0.3,
    position:  { x: 0, y: -5, z: 20 },
  },
} as const

// ─────────────────────────────────────────────
// CAMERA PAR DÉFAUT
// ─────────────────────────────────────────────
export const CAMERA_CONFIG = {
  fov:         60,
  near:        0.1,
  far:         1000,
  position:    { x: 10, y: 8, z: 10 },
  target:      { x: 0, y: 0, z: 0 },
} as const

// ─────────────────────────────────────────────
// CONTROLS PAR DÉFAUT
// ─────────────────────────────────────────────
export const CONTROLS_CONFIG = {
  enableDamping:  true,
  dampingFactor:  0.08,
  minDistance:    1,
  maxDistance:    200,
  minPolarAngle:  0,
  maxPolarAngle:  Math.PI * 0.9,
  panSpeed:       0.8,
  rotateSpeed:    0.6,
  zoomSpeed:      1.2,
} as const