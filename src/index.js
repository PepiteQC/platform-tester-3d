import { troxtmodRouter } from "../server/troxtmod-server.mjs";
import "dotenv/config";

import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { WebSocketServer } from "ws";

// ─── Entities system ──────────────────────────────────────────────────────────
import { entityManager, registerEntityType, TYPE_REGISTRY } from "./systems/EntityManager.js";
import { bus } from "./systems/EventBus.js";

// ─── Custom entity types ──────────────────────────────────────────────────────
import { VehicleSpawn } from "./entities/addons/VehicleSpawn.js";
registerEntityType("vehicle_spawn", VehicleSpawn);

// ─── ESM __dirname shim ───────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, "..");

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT        = Number(process.env.PORT        || 3000);
const HOST        = process.env.HOST               || "127.0.0.1";
const CORS_ORIGIN = process.env.CORS_ORIGIN        || "*";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN        || "";
const AUTOSAVE_MS = Number(process.env.AUTOSAVE_MS || 15_000);
const NODE_ENV    = process.env.NODE_ENV           || "development";

// ─── Paths ────────────────────────────────────────────────────────────────────
const PUBLIC_DIR    = path.join(ROOT, "public");
const ADMIN_DIR     = path.join(PUBLIC_DIR, "admin");
const DATA_DIR      = path.join(ROOT, "data");
const SAVES_DIR     = path.join(ROOT, "saves");
const SNAPSHOTS_DIR = path.join(ROOT, "snapshots");
const EXPORTS_DIR   = path.join(ROOT, "exports");
const ENTITIES_FILE = path.join(DATA_DIR, "entities.json");

const WORLD_FILE    = path.join(DATA_DIR, "world-state.json");
const TEXTURES_FILE = path.join(DATA_DIR, "poly-textures.json");
const SETTINGS_FILE = path.join(DATA_DIR, "admin-settings.json");

for (const dir of [PUBLIC_DIR, ADMIN_DIR, DATA_DIR, SAVES_DIR, SNAPSHOTS_DIR, EXPORTS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const now = () => new Date().toISOString();
const uid = (prefix = "id") => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return structuredClone(fallback);
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`[JSON] Failed reading ${file}:`, err.message);
    return structuredClone(fallback);
  }
}

function writeJson(file, value) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function vec3(value, fallback) {
  if (!Array.isArray(value) || value.length < 3) return [...fallback];
  const out = value.slice(0, 3).map(Number);
  return out.some((n) => !Number.isFinite(n)) ? [...fallback] : out;
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function normalizeColor(value, fallback = "#ffffff") {
  const v = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

// ─── Default data ─────────────────────────────────────────────────────────────
function createDefaultTextures() {
  return [
    { id: "poly_asphalt_qc",        name: "Asphalte QC use",          category: "road",     color: "#2c3035", roughness: 0.92, metallic: 0,   normal: 0.45, ao: 0.75, emission: "#000000", tiling: [6,6], opacity: 1,    notes: "Route sombre, sale, compatible hiver/pluie.", createdAt: now() },
    { id: "poly_concrete_sidewalk", name: "Beton trottoir",            category: "city",     color: "#8b8f90", roughness: 0.88, metallic: 0,   normal: 0.35, ao: 0.65, emission: "#000000", tiling: [4,4], opacity: 1,    notes: "Trottoirs, stationnement, bordures.",          createdAt: now() },
    { id: "poly_brick_red_old",     name: "Brique rouge vieille",      category: "building", color: "#8a3d32", roughness: 0.90, metallic: 0,   normal: 0.55, ao: 0.80, emission: "#000000", tiling: [3,3], opacity: 1,    notes: "Facades vieux Quebec / commerces.",            createdAt: now() },
    { id: "poly_glass_blue",        name: "Vitre bleutee",             category: "glass",    color: "#7ec8ff", roughness: 0.08, metallic: 0,   normal: 0.05, ao: 0.20, emission: "#000000", tiling: [1,1], opacity: 0.38, notes: "Fenetres, portes de depanneur, bureaux.",      createdAt: now() },
    { id: "poly_snow_dirty",        name: "Neige sale bord de route",  category: "weather",  color: "#d8d9d3", roughness: 0.96, metallic: 0,   normal: 0.25, ao: 0.55, emission: "#000000", tiling: [5,5], opacity: 1,    notes: "Accumulation de neige sale facon Quebec RP.", createdAt: now() },
    { id: "poly_neon_cyan",         name: "Neon cyan admin",           category: "emissive", color: "#00e5ff", roughness: 0.20, metallic: 0,   normal: 0.00, ao: 0.10, emission: "#00e5ff", tiling: [1,1], opacity: 1,    notes: "Boutons, signage, debug props.",               createdAt: now() },
    { id: "poly_metal_dark",        name: "Metal sombre",              category: "metal",    color: "#3a3f4b", roughness: 0.30, metallic: 0.9, normal: 0.40, ao: 0.70, emission: "#000000", tiling: [2,2], opacity: 1,    notes: "Structures, cages, garde-fous.",              createdAt: now() },
    { id: "poly_gravel_wet",        name: "Gravier mouille",           category: "road",     color: "#4a4e52", roughness: 0.95, metallic: 0,   normal: 0.50, ao: 0.80, emission: "#000000", tiling: [4,4], opacity: 1,    notes: "Entrees, ruelles, stationnements.",            createdAt: now() },
  ];
}

function createDefaultWorld() {
  return {
    version: 2,
    name: "EtherWorld Platform Tester 3D",
    createdAt: now(),
    updatedAt: now(),
    lastSaveReason: "init",
    platforms: [
      { id: "spawn_platform", name: "Spawn Platform", type: "spawn",    position: [0,0,0],   rotation: [0,0,0], size: [8,0.5,8], color: "#2d3748", material: "poly_asphalt_qc",        safe: true,  locked: true,  createdAt: now(), updatedAt: now() },
      { id: "platform_north", name: "North Platform",  type: "platform", position: [0,0,-20], rotation: [0,0,0], size: [6,0.5,6], color: "#3b4652", material: "poly_concrete_sidewalk", safe: false, locked: false, createdAt: now(), updatedAt: now() },
      { id: "platform_high",  name: "High Platform",   type: "platform", position: [0,8,0],   rotation: [0,0,0], size: [4,0.5,4], color: "#8a3d32", material: "poly_brick_red_old",     safe: false, locked: false, createdAt: now(), updatedAt: now() },
    ],
    props: [
      { id: "admin_terminal", name: "Admin Terminal", type: "terminal", position: [0,1,-4],   rotation: [0,0,0], size: [1.2,1.8,0.25], color: "#00e5ff", material: "poly_neon_cyan",    interactive: true,  locked: true,  createdAt: now(), updatedAt: now() },
      { id: "wall_north",     name: "Mur nord",       type: "wall",     position: [0,1.5,-9], rotation: [0,0,0], size: [8,3,0.35],     color: "#8a3d32", material: "poly_brick_red_old", interactive: false, locked: false, createdAt: now(), updatedAt: now() },
    ],
    players: {},
    logs: [],
  };
}

const DEFAULT_SETTINGS = {
  grid: true, snap: true, snapSize: 0.5,
  physicsDebug: false, adminTheme: "dark-neon",
  maxPlayers: 50, gravity: -9.81,
  fogEnabled: true, fogColor: "#0a0e1a", fogNear: 80, fogFar: 200,
};

// ─── State ────────────────────────────────────────────────────────────────────
let world    = readJson(WORLD_FILE,    createDefaultWorld());
let textures = readJson(TEXTURES_FILE, createDefaultTextures());
let settings = readJson(SETTINGS_FILE, { ...DEFAULT_SETTINGS, updatedAt: now() });

// Migration v1 -> v2
if (!world.version || world.version < 2) {
  world.version = 2;
  console.log("[Migration] World upgraded to v2");
}

// Charger les entites persistees
const savedEntities = readJson(ENTITIES_FILE, []);
if (savedEntities.length > 0) {
  entityManager.loadFromJSON(savedEntities);
  console.log(`[Entities] Restored ${savedEntities.length} entities from disk`);
}

// ─── Persistence ──────────────────────────────────────────────────────────────
function saveAll(reason = "manual") {
  world.updatedAt      = now();
  world.lastSaveReason = reason;
  writeJson(WORLD_FILE,    world);
  writeJson(TEXTURES_FILE, textures);
  writeJson(SETTINGS_FILE, settings);
  writeJson(ENTITIES_FILE, entityManager.toJSON());
}

saveAll("boot");

// ─── Logging ──────────────────────────────────────────────────────────────────
function logAdmin(action, detail = {}) {
  const entry = { id: uid("log"), type: "admin", action, detail, at: now() };
  world.logs.unshift(entry);
  if (world.logs.length > 500) world.logs.length = 500;
  return entry;
}

// ─── Express + WS ─────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server, clientTracking: true });

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "8mb" }));
app.use(rateLimit({ windowMs: 15_000, limit: 500, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(PUBLIC_DIR, { maxAge: "0", index: false }));
app.use("/public", express.static(PUBLIC_DIR, { maxAge: "1h" }));
app.use("/admin",  express.static(ADMIN_DIR,  { maxAge: "1h" }));

// ─── Auth ─────────────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) return next();
  const token = req.headers["x-admin-token"] ?? req.query.token ?? req.body?.adminToken ?? "";
  if (String(token) !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "ADMIN_TOKEN_INVALID" });
  }
  return next();
}

// ─── Helpers publics ──────────────────────────────────────────────────────────
function publicWorldState() {
  return {
    ok: true,
    world: {
      version:   world.version,
      name:      world.name,
      updatedAt: world.updatedAt,
      platforms: world.platforms,
      props:     world.props,
      players:   Object.values(world.players ?? {}),
      logs:      world.logs.slice(0, 100),
    },
    textures,
    settings,
    meta: { online: wss.clients.size, savedAt: world.updatedAt, env: NODE_ENV },
  };
}

function broadcast(payload, exceptSocket = null) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== exceptSocket && client.readyState === 1) client.send(msg);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "landing.html")));
app.get("/game",              (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.get("/landing",           (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "landing.html")));
app.get("/etherforge",        (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "etherforge.html")));
app.get("/character-creator", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "character-creator.html")));
app.get("/troxt-chat",        (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "troxt-chat.html")));
app.get("/health", (_req, res) => res.json({
  ok: true, live: true,
  name: "EtherWorld Admin Sandbox",
  node: process.version, env: NODE_ENV, port: PORT,
  online: wss.clients.size, uptime: process.uptime(),
  memory: process.memoryUsage(), time: now(),
}));

// ─── World ────────────────────────────────────────────────────────────────────
app.get( "/api/world-state",       (_req, res) => res.json(publicWorldState()));
app.post("/api/world-state/save",  requireAdmin, (_req, res) => {
  const log = logAdmin("save_world");
  saveAll("admin_save");
  broadcast({ type: "world_saved", log, world: publicWorldState().world });
  res.json({ ok: true, saved: true, log });
});
app.post("/api/world-state/reset", requireAdmin, (_req, res) => {
  world = createDefaultWorld();
  const log = logAdmin("reset_world");
  saveAll("admin_reset");
  broadcast({ type: "world_reset", log, world: publicWorldState().world });
  res.json({ ok: true, reset: true, log });
});

// ─── Settings ────────────────────────────────────────────────────────────────
app.get(  "/api/settings", (_req, res) => res.json({ ok: true, settings }));
app.patch("/api/settings", requireAdmin, (req, res) => {
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  const patch   = Object.fromEntries(Object.entries(req.body ?? {}).filter(([k]) => allowed.has(k)));
  settings = { ...settings, ...patch, updatedAt: now() };
  const log = logAdmin("update_settings", patch);
  saveAll("settings_update");
  broadcast({ type: "settings_updated", settings, log });
  res.json({ ok: true, settings });
});

// ─── Textures ─────────────────────────────────────────────────────────────────
app.get("/api/poly-textures", (_req, res) => res.json({ ok: true, count: textures.length, textures }));

app.post("/api/poly-textures", requireAdmin, (req, res) => {
  const b = req.body ?? {};
  const tex = {
    id:        String(b.id || uid("mat")),
    name:      String(b.name     || "Poly Texture"),
    category:  String(b.category || "custom"),
    color:     normalizeColor(b.color,    "#ffffff"),
    roughness: clampNumber(b.roughness, 0, 1, 0.75),
    metallic:  clampNumber(b.metallic,  0, 1, 0),
    normal:    clampNumber(b.normal,    0, 1, 0.25),
    ao:        clampNumber(b.ao,        0, 1, 0.6),
    emission:  normalizeColor(b.emission, "#000000"),
    tiling:    [clampNumber(b.tilingX, 0.1, 20, 1), clampNumber(b.tilingY, 0.1, 20, 1)],
    opacity:   clampNumber(b.opacity,   0, 1, 1),
    notes:     String(b.notes || ""),
    createdAt: now(), updatedAt: now(),
  };
  if (textures.find((t) => t.id === tex.id)) {
    return res.status(409).json({ ok: false, error: "TEXTURE_ID_EXISTS" });
  }
  textures.push(tex);
  const log = logAdmin("create_texture", { id: tex.id });
  saveAll("texture_create");
  broadcast({ type: "texture_created", texture: tex, log });
  res.status(201).json({ ok: true, texture: tex });
});

app.patch("/api/poly-textures/:id", requireAdmin, (req, res) => {
  const tex = textures.find((t) => t.id === req.params.id);
  if (!tex) return res.status(404).json({ ok: false, error: "TEXTURE_NOT_FOUND" });
  const b = req.body ?? {};
  if (b.name      !== undefined) tex.name      = String(b.name);
  if (b.category  !== undefined) tex.category  = String(b.category);
  if (b.color     !== undefined) tex.color     = normalizeColor(b.color,    tex.color);
  if (b.roughness !== undefined) tex.roughness = clampNumber(b.roughness, 0, 1, tex.roughness);
  if (b.metallic  !== undefined) tex.metallic  = clampNumber(b.metallic,  0, 1, tex.metallic);
  if (b.normal    !== undefined) tex.normal    = clampNumber(b.normal,    0, 1, tex.normal);
  if (b.ao        !== undefined) tex.ao        = clampNumber(b.ao,        0, 1, tex.ao);
  if (b.emission  !== undefined) tex.emission  = normalizeColor(b.emission, tex.emission);
  if (b.opacity   !== undefined) tex.opacity   = clampNumber(b.opacity,   0, 1, tex.opacity);
  if (b.notes     !== undefined) tex.notes     = String(b.notes);
  tex.updatedAt = now();
  const log = logAdmin("update_texture", { id: tex.id });
  saveAll("texture_update");
  broadcast({ type: "texture_updated", texture: tex, log });
  res.json({ ok: true, texture: tex });
});

app.delete("/api/poly-textures/:id", requireAdmin, (req, res) => {
  const before = textures.length;
  textures = textures.filter((t) => t.id !== req.params.id);
  const deleted = before !== textures.length;
  const log = logAdmin("delete_texture", { id: req.params.id, deleted });
  saveAll("texture_delete");
  broadcast({ type: "texture_deleted", id: req.params.id, deleted, log });
  res.json({ ok: true, deleted });
});

// ─── Platforms ────────────────────────────────────────────────────────────────
app.get("/api/platforms", (_req, res) => res.json({ ok: true, count: world.platforms.length, platforms: world.platforms }));

app.post("/api/platforms", requireAdmin, (req, res) => {
  const b = req.body ?? {};
  const platform = {
    id:       String(b.id || uid("platform")),
    name:     String(b.name    || "Platform"),
    type:     String(b.type    || "custom"),
    position: vec3(b.position, [0, 0, 0]),
    rotation: vec3(b.rotation, [0, 0, 0]),
    size:     vec3(b.size,     [4, 0.5, 4]),
    color:    normalizeColor(b.color, "#4a5568"),
    material: String(b.material || "poly_concrete_sidewalk"),
    safe:     Boolean(b.safe   ?? false),
    locked:   Boolean(b.locked ?? false),
    createdAt: now(), updatedAt: now(),
  };
  if (world.platforms.find((p) => p.id === platform.id)) {
    return res.status(409).json({ ok: false, error: "PLATFORM_ID_EXISTS" });
  }
  world.platforms.push(platform);
  const log = logAdmin("create_platform", { id: platform.id });
  saveAll("platform_create");
  broadcast({ type: "platform_created", platform, log });
  res.status(201).json({ ok: true, platform });
});

app.patch("/api/platforms/:id", requireAdmin, (req, res) => {
  const platform = world.platforms.find((p) => p.id === req.params.id);
  if (!platform) return res.status(404).json({ ok: false, error: "PLATFORM_NOT_FOUND" });
  if (platform.locked && !req.query.force) {
    return res.status(423).json({ ok: false, error: "PLATFORM_LOCKED", hint: "Add ?force=1 to override" });
  }
  const b = req.body ?? {};
  if (b.name     !== undefined) platform.name     = String(b.name);
  if (b.type     !== undefined) platform.type     = String(b.type);
  if (b.position !== undefined) platform.position = vec3(b.position, platform.position);
  if (b.rotation !== undefined) platform.rotation = vec3(b.rotation, platform.rotation);
  if (b.size     !== undefined) platform.size     = vec3(b.size,     platform.size);
  if (b.color    !== undefined) platform.color    = normalizeColor(b.color, platform.color);
  if (b.material !== undefined) platform.material = String(b.material);
  if (b.safe     !== undefined) platform.safe     = Boolean(b.safe);
  if (b.locked   !== undefined) platform.locked   = Boolean(b.locked);
  platform.updatedAt = now();
  const log = logAdmin("update_platform", { id: platform.id });
  saveAll("platform_update");
  broadcast({ type: "platform_updated", platform, log });
  res.json({ ok: true, platform });
});

app.delete("/api/platforms/:id", requireAdmin, (req, res) => {
  const platform = world.platforms.find((p) => p.id === req.params.id);
  if (!platform) return res.status(404).json({ ok: false, error: "PLATFORM_NOT_FOUND" });
  if (platform.locked && !req.query.force) {
    return res.status(423).json({ ok: false, error: "PLATFORM_LOCKED", hint: "Add ?force=1 to override" });
  }
  world.platforms = world.platforms.filter((p) => p.id !== req.params.id);
  const log = logAdmin("delete_platform", { id: req.params.id });
  saveAll("platform_delete");
  broadcast({ type: "platform_deleted", id: req.params.id, log });
  res.json({ ok: true, deleted: true });
});

// ─── Props ────────────────────────────────────────────────────────────────────
app.get("/api/props", (_req, res) => res.json({ ok: true, count: world.props.length, props: world.props }));

app.post("/api/props", requireAdmin, (req, res) => {
  const b = req.body ?? {};
  const prop = {
    id:          String(b.id || uid("prop")),
    name:        String(b.name || "Prop"),
    type:        String(b.type || "cube"),
    position:    vec3(b.position, [0, 1, 0]),
    rotation:    vec3(b.rotation, [0, 0, 0]),
    size:        vec3(b.size,     [1, 1, 1]),
    color:       normalizeColor(b.color, "#ffffff"),
    material:    String(b.material || "poly_concrete_sidewalk"),
    interactive: Boolean(b.interactive ?? false),
    locked:      Boolean(b.locked      ?? false),
    metadata:    b.metadata && typeof b.metadata === "object" ? b.metadata : {},
    createdAt:   now(), updatedAt: now(),
  };
  world.props.push(prop);
  const log = logAdmin("create_prop", { id: prop.id, type: prop.type });
  saveAll("prop_create");
  broadcast({ type: "prop_created", prop, log });
  res.status(201).json({ ok: true, prop });
});

app.patch("/api/props/:id", requireAdmin, (req, res) => {
  const prop = world.props.find((p) => p.id === req.params.id);
  if (!prop) return res.status(404).json({ ok: false, error: "PROP_NOT_FOUND" });
  const b = req.body ?? {};
  if (b.name        !== undefined) prop.name        = String(b.name);
  if (b.type        !== undefined) prop.type        = String(b.type);
  if (b.position    !== undefined) prop.position    = vec3(b.position, prop.position);
  if (b.rotation    !== undefined) prop.rotation    = vec3(b.rotation, prop.rotation);
  if (b.size        !== undefined) prop.size        = vec3(b.size,     prop.size);
  if (b.color       !== undefined) prop.color       = normalizeColor(b.color, prop.color);
  if (b.material    !== undefined) prop.material    = String(b.material);
  if (b.interactive !== undefined) prop.interactive = Boolean(b.interactive);
  if (b.locked      !== undefined) prop.locked      = Boolean(b.locked);
  if (b.metadata    !== undefined && typeof b.metadata === "object") prop.metadata = b.metadata;
  prop.updatedAt = now();
  const log = logAdmin("update_prop", { id: prop.id });
  saveAll("prop_update");
  broadcast({ type: "prop_updated", prop, log });
  res.json({ ok: true, prop });
});

app.delete("/api/props/:id", requireAdmin, (req, res) => {
  const before = world.props.length;
  world.props = world.props.filter((p) => p.id !== req.params.id);
  const deleted = before !== world.props.length;
  const log = logAdmin("delete_prop", { id: req.params.id, deleted });
  saveAll("prop_delete");
  broadcast({ type: "prop_deleted", id: req.params.id, deleted, log });
  res.json({ ok: true, deleted });
});

// ─── Admin extras ─────────────────────────────────────────────────────────────
const PRESETS = {
  cube:      { type: "cube",       size: [1,1,1],     color: "#ffffff", material: "poly_concrete_sidewalk" },
  wall:      { type: "wall",       size: [6,3,0.35],  color: "#8a3d32", material: "poly_brick_red_old"     },
  ramp:      { type: "ramp",       size: [4,0.5,7],   color: "#3b4652", material: "poly_asphalt_qc"        },
  glass:     { type: "glass",      size: [3,2.6,0.2], color: "#7ec8ff", material: "poly_glass_blue"        },
  snow:      { type: "snow_pile",  size: [3,0.8,2],   color: "#d8d9d3", material: "poly_snow_dirty"        },
  neon:      { type: "neon_panel", size: [2,1,0.2],   color: "#00e5ff", material: "poly_neon_cyan"         },
  metalbeam: { type: "beam",       size: [0.3,0.3,8], color: "#3a3f4b", material: "poly_metal_dark"        },
  platform:  { type: "platform",   size: [6,0.4,6],   color: "#4a5568", material: "poly_concrete_sidewalk" },
};

app.get( "/api/admin/presets",       (_req, res) => res.json({ ok: true, presets: Object.keys(PRESETS) }));
app.post("/api/admin/spawn-preset",  requireAdmin, (req, res) => {
  const preset   = String(req.body?.preset || "cube");
  const position = vec3(req.body?.position, [0, 1, 0]);
  const selected = PRESETS[preset] ?? PRESETS.cube;
  const prop = {
    id: uid("prop"), name: `Preset ${preset}`, ...selected,
    position, rotation: [0,0,0],
    interactive: false, locked: false,
    metadata: { preset },
    createdAt: now(), updatedAt: now(),
  };
  world.props.push(prop);
  const log = logAdmin("spawn_preset", { preset, id: prop.id });
  saveAll("spawn_preset");
  broadcast({ type: "prop_created", prop, log });
  res.status(201).json({ ok: true, prop });
});

app.post("/api/admin/snapshot", requireAdmin, (_req, res) => {
  const filename = `snapshot-${Date.now()}.json`;
  writeJson(path.join(SNAPSHOTS_DIR, filename), { at: now(), world, textures, settings, entities: entityManager.toJSON() });
  const log = logAdmin("snapshot", { file: filename });
  res.json({ ok: true, filename, log });
});

app.get("/api/admin/snapshots", requireAdmin, (_req, res) => {
  const files = fs.readdirSync(SNAPSHOTS_DIR).filter((f) => f.endsWith(".json")).sort().reverse().slice(0, 20);
  res.json({ ok: true, count: files.length, files });
});

app.post("/api/admin/export", requireAdmin, (_req, res) => {
  const filename = `world-export-${Date.now()}.json`;
  const payload  = { exportedAt: now(), world, textures, settings, entities: entityManager.toJSON() };
  writeJson(path.join(EXPORTS_DIR, filename), payload);
  const log = logAdmin("export_world", { file: filename });
  saveAll("export_world");
  res.json({ ok: true, filename, payload, log });
});

app.post("/api/admin/clear-logs", requireAdmin, (_req, res) => {
  const count = world.logs.length;
  world.logs  = [];
  const log   = logAdmin("clear_logs", { cleared: count });
  saveAll("clear_logs");
  broadcast({ type: "logs_cleared", log });
  res.json({ ok: true, cleared: count });
});

// ─── Entities CRUD ────────────────────────────────────────────────────────────
app.get("/api/entities", (req, res) => {
  const { type, tag, category } = req.query;
  let result = entityManager.all();
  if (type)     result = entityManager.byType(type);
  if (tag)      result = entityManager.byTag(tag);
  if (category) result = entityManager.byCategory(category);
  res.json({ ok: true, count: result.length, entities: result.map((e) => e.toJSON()) });
});

app.get("/api/entities/:id", (req, res) => {
  const e = entityManager.get(req.params.id);
  if (!e) return res.status(404).json({ ok: false, error: "ENTITY_NOT_FOUND" });
  res.json({ ok: true, entity: e.toJSON() });
});

app.post("/api/entities", requireAdmin, (req, res) => {
  try {
    const entity = entityManager.create(req.body.type, req.body);
    const log    = logAdmin("entity_created", { id: entity.id, type: entity.type });
    saveAll("entity_create");
    broadcast({ type: "entity_created", entity: entity.toJSON(), log });
    res.status(201).json({ ok: true, entity: entity.toJSON() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.patch("/api/entities/:id", requireAdmin, (req, res) => {
  try {
    const entity = entityManager.update(req.params.id, req.body);
    const log    = logAdmin("entity_updated", { id: entity.id });
    saveAll("entity_update");
    broadcast({ type: "entity_updated", entity: entity.toJSON(), log });
    res.json({ ok: true, entity: entity.toJSON() });
  } catch (err) {
    res.status(404).json({ ok: false, error: err.message });
  }
});

app.delete("/api/entities/:id", requireAdmin, (req, res) => {
  const deleted = entityManager.destroy(req.params.id);
  if (!deleted) return res.status(404).json({ ok: false, error: "ENTITY_NOT_FOUND" });
  const log = logAdmin("entity_deleted", { id: req.params.id });
  saveAll("entity_delete");
  broadcast({ type: "entity_deleted", id: req.params.id, log });
  res.json({ ok: true, deleted: true });
});

app.post("/api/entities/:id/interact", (req, res) => {
  const entity = entityManager.get(req.params.id);
  if (!entity) return res.status(404).json({ ok: false, error: "ENTITY_NOT_FOUND" });
  if (typeof entity.interact !== "function") {
    return res.status(400).json({ ok: false, error: "NOT_INTERACTIVE" });
  }
  const result = entity.interact(req.body?.playerId ?? "anonymous");
  broadcast({ type: "prop_interacted", entityId: entity.id, result });
  res.json({ ok: true, result });
});

app.post("/api/entities/:id/talk", (req, res) => {
  const entity = entityManager.get(req.params.id);
  if (!entity || entity.type !== "npc") {
    return res.status(404).json({ ok: false, error: "NPC_NOT_FOUND" });
  }
  const result = entity.talk(req.body?.playerId ?? "anonymous");
  broadcast({ type: "npc_talked", entityId: entity.id, result });
  res.json({ ok: true, ...result });
});

app.post("/api/entities/:id/damage", requireAdmin, (req, res) => {
  const entity = entityManager.get(req.params.id);
  if (!entity || typeof entity.damage !== "function") {
    return res.status(404).json({ ok: false, error: "ENTITY_NOT_FOUND_OR_NOT_DAMAGEABLE" });
  }
  const hp  = entity.damage(Number(req.body?.amount ?? 10), req.body?.source ?? null);
  const log = logAdmin("entity_damaged", { id: entity.id, hp });
  broadcast({ type: "entity_damaged", entityId: entity.id, hp, log });
  res.json({ ok: true, hp, entity: entity.toJSON() });
});

app.get("/api/entity-types", (_req, res) => {
  res.json({ ok: true, types: [...TYPE_REGISTRY.keys()] });
});

// ─── 404 + Error handlers ────────────────────────────────────────────────────
app.use("/troxtmod", troxtmodRouter);
app.use("/api/troxtmod", troxtmodRouter);

app.use((_req, res) => res.status(404).json({ ok: false, error: "NOT_FOUND" }));
app.use((err, _req, res, _next) => {
  console.error("[Express Error]", err);
  res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", message: err.message });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET
// ═══════════════════════════════════════════════════════════════════════════════
const playerHeartbeat = new Map();

wss.on("connection", (socket, req) => {
  const playerId = uid("player");
  const ip       = req.socket.remoteAddress;

  world.players[playerId] = {
    id: playerId, name: "Guest", ip,
    position: [0, 2, 0], rotation: [0, 0, 0],
    connectedAt: now(), updatedAt: now(),
  };

  playerHeartbeat.set(socket, Date.now());

  socket.send(JSON.stringify({ type: "welcome", playerId, state: publicWorldState() }));
  broadcast({ type: "player_joined", player: world.players[playerId], online: wss.clients.size }, socket);

  socket.on("message", (raw) => {
    playerHeartbeat.set(socket, Date.now());
    let data;
    try { data = JSON.parse(String(raw)); }
    catch { socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" })); return; }

    switch (data.type) {
      case "ping":
        socket.send(JSON.stringify({ type: "pong", time: Date.now() }));
        break;

      case "player_update": {
        const player = world.players[playerId];
        if (!player) break;
        player.name      = String(data.name || player.name || "Guest").slice(0, 32);
        player.position  = vec3(data.position, player.position);
        player.rotation  = vec3(data.rotation, player.rotation);
        player.updatedAt = now();
        broadcast({ type: "player_update", player }, socket);
        break;
      }

      case "chat": {
        const player = world.players[playerId];
        const msg    = String(data.message ?? "").trim().slice(0, 256);
        if (!msg) break;
        broadcast({ type: "chat", playerId, name: player?.name ?? "Guest", message: msg, at: now() });
        break;
      }

      case "admin_refresh":
        socket.send(JSON.stringify({ type: "world_state", state: publicWorldState() }));
        break;

      default:
        socket.send(JSON.stringify({ type: "error", message: `Unknown type: ${data.type}` }));
    }
  });

  socket.on("close", () => {
    playerHeartbeat.delete(socket);
    delete world.players[playerId];
    broadcast({ type: "player_left", playerId, online: wss.clients.size });
  });

  socket.on("error", (err) => console.error(`[WS] Player ${playerId} error:`, err.message));
});

// Heartbeat — kick connexions mortes apres 60s
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [socket, lastSeen] of playerHeartbeat) {
    if (lastSeen < cutoff) { console.log("[WS] Stale connection terminated"); socket.terminate(); }
  }
}, 30_000);

// ─── Autosave ────────────────────────────────────────────────────────────────
setInterval(() => {
  saveAll("autosave");
  broadcast({ type: "autosave", at: now(), online: wss.clients.size });
}, AUTOSAVE_MS);

// ─── NPC tick (pathfinding) ──────────────────────────────────────────────────
let lastTick = Date.now();
setInterval(() => {
  const now_ms  = Date.now();
  const deltaMs = now_ms - lastTick;
  lastTick      = now_ms;
  const npcs    = entityManager.byType("npc");
  for (const npc of npcs) {
    npc.tick(deltaMs);
  }
  if (npcs.length > 0) broadcast({ type: "npcs_tick", npcs: npcs.map((n) => ({ id: n.id, position: n.position, state: n.state })) });
}, 200);

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[Server] ${signal} — saving and shutting down...`);
  saveAll("shutdown");
  wss.clients.forEach((c) => c.close(1001, "Server shutting down"));
  server.close(() => { console.log("[Server] Closed cleanly."); process.exit(0); });
  setTimeout(() => process.exit(1), 5_000);
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException",  (err) => { console.error("[FATAL] uncaughtException:",  err); saveAll("crash"); process.exit(1); });
process.on("unhandledRejection", (err) => { console.error("[FATAL] unhandledRejection:", err); });

// ─── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, HOST, () => {
  console.log("");
  console.log("══════════════════════════════════════════════════");
  console.log("  EtherWorld Admin Sandbox Server");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Local   : http://${HOST}:${PORT}`);
  console.log(`  Admin   : http://${HOST}:${PORT}/admin`);
  console.log(`  Health  : http://${HOST}:${PORT}/health`);
  console.log(`  API     : http://${HOST}:${PORT}/api/world-state`);
  console.log(`  WS      : ws://${HOST}:${PORT}`);
  console.log(`  Env     : ${NODE_ENV}`);
  console.log("══════════════════════════════════════════════════");
  console.log("");
});










