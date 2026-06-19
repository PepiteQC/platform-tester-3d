// ════════════════════════════════════════════════════════════
//  ProceduralWorld.mjs — Génération procédurale de niveaux
//  Basé sur ForgeFactory + seed déterministe
// ════════════════════════════════════════════════════════════

// ── LCG Random déterministe ───────────────────────────────────
class SeededRandom {
  constructor(seed = 42) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  range(min, max) { return min + this.next() * (max - min); }
  int(min, max)   { return Math.floor(this.range(min, max + 1)); }
  pick(arr)       { return arr[this.int(0, arr.length - 1)]; }
  bool(p = 0.5)   { return this.next() < p; }
}

// ── Palettes de matériaux par thème ──────────────────────────
const THEMES = {
  urban: {
    platform:  ["poly_asphalt_qc", "poly_concrete_sidewalk"],
    accent:    ["poly_brick_red_old", "poly_metal_dark"],
    glass:     ["poly_glass_blue"],
    emissive:  ["poly_neon_cyan"],
    colors:    ["#2d3748", "#3b4652", "#4a5568", "#2c3035"],
  },
  winter: {
    platform:  ["poly_snow_dirty", "poly_concrete_sidewalk"],
    accent:    ["poly_gravel_wet", "poly_metal_dark"],
    glass:     ["poly_glass_blue"],
    emissive:  ["poly_neon_cyan"],
    colors:    ["#d8d9d3", "#8b8f90", "#b0b8c4", "#6b7280"],
  },
  neon: {
    platform:  ["poly_metal_dark", "poly_asphalt_qc"],
    accent:    ["poly_neon_cyan", "poly_glass_blue"],
    glass:     ["poly_glass_blue"],
    emissive:  ["poly_neon_cyan"],
    colors:    ["#00e5ff", "#ff00aa", "#aa00ff", "#00ff88", "#ff6600"],
  },
  ruins: {
    platform:  ["poly_brick_red_old", "poly_gravel_wet"],
    accent:    ["poly_concrete_sidewalk", "poly_asphalt_qc"],
    glass:     ["poly_glass_blue"],
    emissive:  ["poly_neon_cyan"],
    colors:    ["#8a3d32", "#6b7280", "#4a5568", "#7c6a5a"],
  },
};

// ── Générateur principal ──────────────────────────────────────
export class ProceduralWorldGenerator {

  generate({ seed = 42, theme = "urban", count = 20, style = "tower" } = {}) {
    const rng      = new SeededRandom(seed);
    const palette  = THEMES[theme] || THEMES.urban;
    const platforms = [];
    const props     = [];

    const now = () => new Date().toISOString();

    // Spawn obligatoire
    platforms.push({
      id:       "spawn_platform",
      name:     "Spawn Platform",
      type:     "spawn",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      size:     [8, 0.5, 8],
      color:    "#2d3748",
      material: "poly_asphalt_qc",
      safe:     true,
      locked:   true,
      createdAt: now(), updatedAt: now(),
    });

    // Générer selon le style
    if (style === "tower")    this.#genTower(rng, palette, platforms, props, count, now);
    if (style === "parkour")  this.#genParkour(rng, palette, platforms, props, count, now);
    if (style === "island")   this.#genIslands(rng, palette, platforms, props, count, now);
    if (style === "maze")     this.#genMaze(rng, palette, platforms, props, count, now);
    if (style === "spiral")   this.#genSpiral(rng, palette, platforms, props, count, now);

    return { platforms, props, seed, theme, style, generatedAt: now() };
  }

  // ── Tower : montée verticale ────────────────────────────────
  #genTower(rng, palette, platforms, props, count, now) {
    let x = 0, y = 0, z = -5;

    for (let i = 0; i < count; i++) {
      const w = rng.range(2.5, 6);
      const d = rng.range(2.5, 6);
      const h = 0.4;
      const gap = rng.range(2, 4);
      const rise = rng.range(1.5, 3.5);

      x += rng.range(-4, 4);
      z -= gap;
      y += rise;

      const mat  = rng.pick(palette.platform);
      const color = rng.pick(palette.colors);

      platforms.push({
        id: `plat_${i}_${rng.int(1000,9999)}`,
        name: `Platform ${i + 1}`,
        type: i === count - 1 ? "goal" : "platform",
        position: [
          Math.max(-30, Math.min(30, x)),
          y,
          Math.max(-200, z),
        ],
        rotation: [0, 0, 0],
        size:     [w, h, d],
        color,
        material: mat,
        safe:     false,
        locked:   false,
        createdAt: now(), updatedAt: now(),
      });

      // Décor aléatoire
      if (rng.bool(0.3)) {
        props.push(this.#makeDecorProp(rng, palette, [x, y + 0.5, z - d/2 + 0.5], now));
      }
    }
  }

  // ── Parkour : sauts latéraux ────────────────────────────────
  #genParkour(rng, palette, platforms, props, count, now) {
    let x = 0, y = 1, z = -8;

    for (let i = 0; i < count; i++) {
      const w = rng.range(1.5, 4);
      const d = rng.range(1.5, 4);

      x += rng.range(-6, 6);
      z -= rng.range(3, 7);
      y += rng.range(-0.5, 2);
      y = Math.max(0.5, y);

      const special = rng.next() < 0.15;
      const type    = special ? rng.pick(["bouncy", "falling"]) : "platform";
      const mat     = special ? rng.pick(palette.emissive) : rng.pick(palette.platform);
      const color   = special ? rng.pick(palette.colors) : rng.pick(palette.colors);

      platforms.push({
        id: `plat_${i}_${rng.int(1000,9999)}`,
        name: `Jump ${i + 1}${special ? " ⚡" : ""}`,
        type,
        position: [Math.max(-40, Math.min(40, x)), y, z],
        rotation: [0, 0, 0],
        size:     [w, 0.35, d],
        color,
        material: mat,
        safe:     false,
        locked:   false,
        bounceForce: type === "bouncy" ? 16 : undefined,
        fallDelay:   type === "falling" ? 0.8 : undefined,
        createdAt: now(), updatedAt: now(),
      });
    }
  }

  // ── Islands : îles flottantes ───────────────────────────────
  #genIslands(rng, palette, platforms, props, count, now) {
    const rings = Math.ceil(count / 6);

    for (let ring = 0; ring < rings; ring++) {
      const radius  = 8 + ring * 10;
      const height  = ring * 4;
      const perRing = Math.min(6 + ring * 2, count - platforms.length + 1);

      for (let j = 0; j < perRing && platforms.length - 1 < count; j++) {
        const angle = (j / perRing) * Math.PI * 2 + rng.range(-0.3, 0.3);
        const x     = Math.cos(angle) * radius + rng.range(-2, 2);
        const z     = Math.sin(angle) * radius + rng.range(-2, 2);
        const w     = rng.range(3, 7);
        const d     = rng.range(3, 7);

        platforms.push({
          id: `island_${ring}_${j}`,
          name: `Island ${ring}-${j}`,
          type: ring === rings - 1 && j === 0 ? "goal" : "platform",
          position: [x, height + rng.range(-1, 1), z],
          rotation: [0, 0, 0],
          size:     [w, 0.5, d],
          color:    rng.pick(palette.colors),
          material: rng.pick(palette.platform),
          safe: false, locked: false,
          createdAt: now(), updatedAt: now(),
        });

        if (rng.bool(0.25)) {
          props.push(this.#makeDecorProp(rng, palette, [x, height + 0.8, z], now));
        }
      }
    }
  }

  // ── Maze : labyrinthe horizontal ────────────────────────────
  #genMaze(rng, palette, platforms, props, count, now) {
    const GRID = 5;
    const visited = new Set(["0,0"]);
    let cx = 0, cz = 0;

    for (let i = 0; i < count; i++) {
      const dirs = [
        [GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID]
      ].filter(([dx, dz]) => !visited.has(`${cx+dx},${cz+dz}`));

      if (dirs.length === 0) break;

      const [dx, dz] = rng.pick(dirs);
      cx += dx; cz += dz;
      visited.add(`${cx},${cz}`);

      platforms.push({
        id: `maze_${i}`,
        name: `Maze ${i + 1}`,
        type: i === count - 1 ? "goal" : "platform",
        position: [cx, 0.5, cz],
        rotation: [0, 0, 0],
        size:     [4.5, 0.4, 4.5],
        color:    rng.pick(palette.colors),
        material: rng.pick(palette.platform),
        safe: false, locked: false,
        createdAt: now(), updatedAt: now(),
      });

      // Murs
      if (rng.bool(0.4)) {
        props.push({
          id: `wall_${i}`,
          name: "Mur",
          type: "wall",
          position: [cx + rng.range(-1.5, 1.5), 1.5, cz + rng.range(-1.5, 1.5)],
          rotation: [0, rng.range(0, Math.PI), 0],
          size:     [0.3, 2.5, rng.range(2, 4)],
          color:    rng.pick(palette.accent),
          material: rng.pick(palette.accent),
          interactive: false, locked: false,
          metadata: { generated: true },
          createdAt: now(), updatedAt: now(),
        });
      }
    }
  }

  // ── Spiral : montée en spirale ──────────────────────────────
  #genSpiral(rng, palette, platforms, props, count, now) {
    for (let i = 0; i < count; i++) {
      const t      = (i / count) * Math.PI * 6;
      const radius = 5 + i * 0.8;
      const x      = Math.cos(t) * radius;
      const z      = Math.sin(t) * radius;
      const y      = i * 1.2;

      platforms.push({
        id: `spiral_${i}`,
        name: `Spiral ${i + 1}`,
        type: i === count - 1 ? "goal" : "platform",
        position: [x, y, z],
        rotation: [0, t, 0],
        size:     [rng.range(2.5, 4.5), 0.4, rng.range(2.5, 4.5)],
        color:    rng.pick(palette.colors),
        material: rng.pick(palette.platform),
        safe: false, locked: false,
        createdAt: now(), updatedAt: now(),
      });

      if (rng.bool(0.2)) {
        props.push(this.#makeDecorProp(rng, palette, [x, y + 0.8, z], now));
      }
    }
  }

  // ── Décor prop ───────────────────────────────────────────────
  #makeDecorProp(rng, palette, position, now) {
    const types = [
      { type: "neon_panel",  size: [0.2, 1.2, 0.08], mat: "poly_neon_cyan",   color: "#00e5ff" },
      { type: "cube",        size: [0.6, 0.6, 0.6],  mat: "poly_metal_dark",  color: "#3a3f4b" },
      { type: "beam",        size: [0.2, 2.5, 0.2],  mat: "poly_metal_dark",  color: "#293241" },
      { type: "glass_pane",  size: [1.5, 2, 0.05],   mat: "poly_glass_blue",  color: "#7ec8ff" },
    ];
    const t = rng.pick(types);
    return {
      id: `decor_${rng.int(10000,99999)}`,
      name: t.type,
      type: t.type,
      position,
      rotation: [0, rng.range(0, Math.PI * 2), 0],
      size:     t.size,
      color:    t.color,
      material: t.mat,
      interactive: false,
      locked:      false,
      metadata:    { generated: true, decor: true },
      createdAt: now(), updatedAt: now(),
    };
  }
}

export const proceduralWorld = new ProceduralWorldGenerator();
export default proceduralWorld;
