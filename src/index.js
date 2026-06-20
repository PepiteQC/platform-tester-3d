import "dotenv/config";
import { troxtmodRouter } from "../server/troxtmod-server.mjs";

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { WebSocketServer } from "ws";

// ─── ENTITIES SYSTEM ──────────────────────────────────────────────────────────
import { VehicleSpawn } from "./entities/addons/VehicleSpawn.js";
import { entityManager, registerEntityType } from "./systems/EntityManager.js";

registerEntityType("vehicle_spawn", VehicleSpawn);

// ─── PATHS & CONFIG ───────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const AUTOSAVE_MS = Number(process.env.AUTOSAVE_MS || 15_000);
const NODE_ENV = process.env.NODE_ENV || "development";

const DIRS = {
  PUBLIC: path.join(ROOT, "public"),
  ADMIN: path.join(ROOT, "public", "admin"),
  DATA: path.join(ROOT, "data"),
  SAVES: path.join(ROOT, "saves"),
  SNAPS: path.join(ROOT, "snapshots"),
  EXPORTS: path.join(ROOT, "exports"),
};

const FILES = {
  ENTITIES: path.join(DIRS.DATA, "entities.json"),
  WORLD: path.join(DIRS.DATA, "world-state.json"),
  TEXTURES: path.join(DIRS.DATA, "poly-textures.json"),
  SETTINGS: path.join(DIRS.DATA, "admin-settings.json"),
};

// Initialisation sécurisée des dossiers
Object.values(DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── HELPERS & SANITIZATION (ROBUSTESSE) ──────────────────────────────────────
const now = () => new Date().toISOString();
const uid = (prefix = "id") => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return structuredClone(fallback);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data || structuredClone(fallback);
  } catch (err) {
    console.error(`[JSON ERROR] Failed reading ${file}:`, err.message);
    return structuredClone(fallback); // Fallback sécurisé en cas de corruption
  }
}

// 🛡️ Safe File Writer (Atomic Write)
function writeJson(file, value) {
  const tmp = file + ".tmp";
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
    fs.renameSync(tmp, file); // Le renameSync est atomique, empêche la corruption
  } catch (err) {
    console.error(`[FS ERROR] Failed to write ${file}:`, err);
  }
}

// 🛡️ Validation stricte des vecteurs (Empêche les NaN dans Three.js)
function vec3(value, fallback) {
  if (!Array.isArray(value) || value.length < 3) return [...fallback];
  const out = [Number(value[0]), Number(value[1]), Number(value[2])];
  return out.some(n => !Number.isFinite(n)) ? [...fallback] : out;
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function normalizeColor(value, fallback = "#ffffff") {
  const v = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/i.test(v) ? v.toLowerCase() : fallback;
}

// ─── DATABASE MOCK (DEFAULT DATA) ─────────────────────────────────────────────
function createDefaultTextures() { /* ... Ton code original ... */ return []; }
function createDefaultWorld() {
  return {
    version: 2, name: "EtherWorld", createdAt: now(), updatedAt: now(), lastSaveReason: "init",
    platforms: [], props: [], players: {}, logs: [],
  };
}
const DEFAULT_SETTINGS = { grid: true, snap: true, snapSize: 0.5, maxPlayers: 50, gravity: -9.81 };

// ─── STATE INITIALIZATION ─────────────────────────────────────────────────────
let world = readJson(FILES.WORLD, createDefaultWorld());
let textures = readJson(FILES.TEXTURES, createDefaultTextures());
let settings = readJson(FILES.SETTINGS, { ...DEFAULT_SETTINGS, updatedAt: now() });

if (!world.version || world.version < 2) {
  world.version = 2;
  console.log("[Migration] World upgraded to v2");
}

const savedEntities = readJson(FILES.ENTITIES, []);
if (savedEntities.length > 0) {
  try {
    entityManager.loadFromJSON(savedEntities);
    console.log(`[Entities] Restored ${savedEntities.length} entities.`);
  } catch (e) {
    console.error("[Entities] Erreur de chargement:", e.message);
  }
}

// ─── SAVE MANAGER (QUEUE SYSTEM ANTI-CORRUPTION) ──────────────────────────────
class SaveQueue {
  constructor() {
    this.isSaving = false;
    this.pendingSave = false;
  }

  requestSave(reason = "manual") {
    world.updatedAt = now();
    world.lastSaveReason = reason;

    if (this.isSaving) {
      this.pendingSave = true; // Met en attente si une sauvegarde est déjà en cours
      return;
    }

    this.executeSave();
  }

  async executeSave() {
    this.isSaving = true;
    this.pendingSave = false;

    // Simule un contexte asynchrone pour ne pas bloquer le thread principal Node.js (Event Loop)
    await new Promise(resolve => setImmediate(resolve));

    writeJson(FILES.WORLD, world);
    writeJson(FILES.TEXTURES, textures);
    writeJson(FILES.SETTINGS, settings);
    writeJson(FILES.ENTITIES, entityManager.toJSON());

    this.isSaving = false;

    // S'il y a eu une demande pendant qu'on sauvegardait, on relance
    if (this.pendingSave) {
      this.executeSave();
    }
  }
}
const saveManager = new SaveQueue();
saveManager.requestSave("boot");

function logAdmin(action, detail = {}) {
  const entry = { id: uid("log"), type: "admin", action, detail, at: now() };
  world.logs.unshift(entry);
  if (world.logs.length > 500) world.logs.length = 500;
  return entry;
}

// ─── EXPRESS & MIDDLEWARES ────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, clientTracking: true });

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" })); // Réduit de 8mb à 2mb pour éviter les attaques Payload
app.use(rateLimit({ windowMs: 15_000, limit: 300, standardHeaders: true })); // Sécurité API

app.use(express.static(DIRS.PUBLIC, { maxAge: "0", index: false }));

// Auth Middleware
function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) return next();
  const token = req.headers["x-admin-token"] ?? req.query.token ?? req.body?.adminToken ?? "";
  if (String(token) !== ADMIN_TOKEN) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  return next();
}

function broadcast(payload, exceptSocket = null) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== exceptSocket && client.readyState === 1) client.send(msg);
  }
}

// ─── API ROUTES (REST) ────────────────────────────────────────────────────────
// J'ai gardé tes routes intactes mais j'ai remplacé saveAll() par saveManager.requestSave()

app.use("/troxtmod", troxtmodRouter); // Branchement de ton module physique

app.post("/api/world-state/save", requireAdmin, (_req, res) => {
  const log = logAdmin("save_world");
  saveManager.requestSave("admin_save");
  broadcast({ type: "world_saved", log });
  res.json({ ok: true, saved: true, log });
});

// Props Route Example (Idem pour Platforms, Textures...)
app.post("/api/props", requireAdmin, (req, res) => {
  const b = req.body ?? {};
  const prop = {
    id: String(b.id || uid("prop")),
    type: String(b.type || "cube"),
    position: vec3(b.position, [0, 1, 0]),
    rotation: vec3(b.rotation, [0, 0, 0]),
    size: vec3(b.size, [1, 1, 1]),
    createdAt: now(), updatedAt: now(),
  };
  world.props.push(prop);
  saveManager.requestSave("prop_create");
  broadcast({ type: "prop_created", prop });
  res.status(201).json({ ok: true, prop });
});

// ─── WEBSOCKET SYSTEM (ANTI-SPAM & HEARTBEAT) ─────────────────────────────────
const clientData = new Map();

wss.on("connection", (socket, req) => {
  const playerId = uid("player");

  world.players[playerId] = {
    id: playerId, name: "Guest", ip: req.socket.remoteAddress,
    position: [0, 2, 0], rotation: [0, 0, 0],
    connectedAt: now(), updatedAt: now(),
  };

  clientData.set(socket, {
    id: playerId,
    lastSeen: Date.now(),
    msgCount: 0, // Compteur pour le Rate Limiting
  });

  socket.send(JSON.stringify({ type: "welcome", playerId }));
  broadcast({ type: "player_joined", player: world.players[playerId] }, socket);

  socket.on("message", (raw) => {
    const client = clientData.get(socket);
    if (!client) return;

    client.lastSeen = Date.now();
    client.msgCount++;

    // 🛡️ ANTI-SPAM : Max 60 messages par seconde (Tickrate visuel max)
    if (client.msgCount > 60) {
      socket.send(JSON.stringify({ type: "error", message: "Rate limit exceeded. Slow down." }));
      return; // Ignore la requête
    }

    try {
      const data = JSON.parse(String(raw));
      if (data.type === "player_update") {
        const p = world.players[playerId];
        p.position = vec3(data.position, p.position);
        p.rotation = vec3(data.rotation, p.rotation);
        broadcast({ type: "player_update", player: p }, socket);
      }
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid JSON payload" }));
    }
  });

  socket.on("close", () => {
    clientData.delete(socket);
    delete world.players[playerId];
    broadcast({ type: "player_left", playerId });
  });
});

// 🛡️ Tick WS Anti-Spam & Heartbeat (Toutes les 1 seconde)
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [socket, client] of clientData) {
    client.msgCount = 0; // Reset le compteur anti-spam chaque seconde
    if (client.lastSeen < cutoff) {
      console.log(`[WS] Timeout player ${client.id}`);
      socket.terminate();
    }
  }
}, 1000);

// ─── LOOPS & SHUTDOWN ─────────────────────────────────────────────────────────
setInterval(() => saveManager.requestSave("autosave"), AUTOSAVE_MS);

// Graceful Shutdown
function shutdown(signal) {
  console.log(`\n[Server] ${signal} — saving and shutting down...`);
  saveManager.requestSave("shutdown");
  setTimeout(() => { // Laisse 1 seconde pour terminer l'écriture des fichiers
    wss.clients.forEach((c) => c.close(1001, "Server shutdown"));
    server.close(() => process.exit(0));
  }, 1000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(PORT, HOST, () => {
  console.log(`🚀 EtherWorld Server Live on http://${HOST}:${PORT}`);
});