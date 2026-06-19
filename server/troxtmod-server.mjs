/**
 * EtherWorld — Garry''s Mod Style Entity System
 * Bolt-generated module — branché comme addon sur src/index.js
 * NE PAS MODIFIER src/index.js pour ça
 */

import express    from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join }  from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── World state Garry''s Mod style ────────────────────────────
export const troxtmodWorld = {
  props:     new Map(),
  entities:  new Map(),
  platforms: [],
  effects:   [],
  players:   new Map(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// ── Router Express (pas de serveur séparé) ────────────────────
export const troxtmodRouter = express.Router();

// ─── PROPS ────────────────────────────────────────────────────
troxtmodRouter.get("/props", (_req, res) => {
  res.json({ success: true, count: troxtmodWorld.props.size, props: [...troxtmodWorld.props.values()] });
});

troxtmodRouter.get("/props/:id", (req, res) => {
  const p = troxtmodWorld.props.get(req.params.id);
  if (!p) return res.status(404).json({ success: false, error: "Prop not found" });
  res.json({ success: true, prop: p });
});

troxtmodRouter.post("/props", (req, res) => {
  const prop = {
    id:          req.body.id || `prop_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    type:        req.body.type        || "physics_prop",
    category:    req.body.category    || "basic",
    name:        req.body.name        || "New Prop",
    position:    req.body.position    || { x:0, y:0, z:0 },
    rotation:    req.body.rotation    || { x:0, y:0, z:0, w:1 },
    scale:       req.body.scale       ?? 1,
    mass:        req.body.mass        ?? 1,
    restitution: req.body.restitution ?? 0.3,
    friction:    req.body.friction    ?? 0.5,
    velocity:    req.body.velocity    || { x:0, y:0, z:0 },
    metadata:    req.body.metadata    || {},
    createdAt:   Date.now(),
    updatedAt:   Date.now(),
  };
  troxtmodWorld.props.set(prop.id, prop);
  troxtmodWorld.updatedAt = Date.now();
  res.status(201).json({ success: true, prop });
});

troxtmodRouter.put("/props/:id", (req, res) => {
  const prop = troxtmodWorld.props.get(req.params.id);
  if (!prop) return res.status(404).json({ success: false, error: "Prop not found" });
  const updated = { ...prop, ...req.body, id: prop.id, updatedAt: Date.now() };
  troxtmodWorld.props.set(prop.id, updated);
  troxtmodWorld.updatedAt = Date.now();
  res.json({ success: true, prop: updated });
});

troxtmodRouter.delete("/props/:id", (req, res) => {
  const prop = troxtmodWorld.props.get(req.params.id);
  if (!prop) return res.status(404).json({ success: false, error: "Prop not found" });
  troxtmodWorld.props.delete(req.params.id);
  troxtmodWorld.updatedAt = Date.now();
  res.json({ success: true, deleted: prop });
});

troxtmodRouter.delete("/props", (_req, res) => {
  const count = troxtmodWorld.props.size;
  troxtmodWorld.props.clear();
  troxtmodWorld.updatedAt = Date.now();
  res.json({ success: true, deletedCount: count });
});

// ─── ENTITIES ─────────────────────────────────────────────────
troxtmodRouter.get("/entities", (_req, res) => {
  res.json({ success: true, count: troxtmodWorld.entities.size, entities: [...troxtmodWorld.entities.values()] });
});

troxtmodRouter.get("/entities/:id", (req, res) => {
  const e = troxtmodWorld.entities.get(req.params.id);
  if (!e) return res.status(404).json({ success: false, error: "Entity not found" });
  res.json({ success: true, entity: e });
});

troxtmodRouter.post("/entities", (req, res) => {
  const entity = {
    id:        req.body.id || `entity_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    type:      req.body.type     || "base_entity",
    name:      req.body.name     || "New Entity",
    position:  req.body.position || { x:0, y:0, z:0 },
    rotation:  req.body.rotation || { x:0, y:0, z:0, w:1 },
    scale:     req.body.scale    ?? 1,
    active:    req.body.active   ?? true,
    visible:   req.body.visible  ?? true,
    tags:      req.body.tags     || [],
    metadata:  req.body.metadata || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  troxtmodWorld.entities.set(entity.id, entity);
  troxtmodWorld.updatedAt = Date.now();
  res.status(201).json({ success: true, entity });
});

troxtmodRouter.put("/entities/:id", (req, res) => {
  const entity = troxtmodWorld.entities.get(req.params.id);
  if (!entity) return res.status(404).json({ success: false, error: "Entity not found" });
  const updated = { ...entity, ...req.body, id: entity.id, updatedAt: Date.now() };
  troxtmodWorld.entities.set(entity.id, updated);
  troxtmodWorld.updatedAt = Date.now();
  res.json({ success: true, entity: updated });
});

troxtmodRouter.delete("/entities/:id", (req, res) => {
  const entity = troxtmodWorld.entities.get(req.params.id);
  if (!entity) return res.status(404).json({ success: false, error: "Entity not found" });
  troxtmodWorld.entities.delete(req.params.id);
  troxtmodWorld.updatedAt = Date.now();
  res.json({ success: true, deleted: entity });
});

// ─── PLATFORMS ────────────────────────────────────────────────
troxtmodRouter.get("/platforms", (_req, res) => {
  res.json({ success: true, count: troxtmodWorld.platforms.length, platforms: troxtmodWorld.platforms });
});

troxtmodRouter.post("/platforms", (req, res) => {
  const platform = { id: `troxtmod_platform_${Date.now()}`, ...req.body, createdAt: Date.now() };
  troxtmodWorld.platforms.push(platform);
  troxtmodWorld.updatedAt = Date.now();
  res.status(201).json({ success: true, platform });
});

troxtmodRouter.delete("/platforms/:id", (req, res) => {
  const idx = troxtmodWorld.platforms.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Platform not found" });
  const deleted = troxtmodWorld.platforms.splice(idx, 1)[0];
  troxtmodWorld.updatedAt = Date.now();
  res.json({ success: true, deleted });
});

// ─── EFFECTS ──────────────────────────────────────────────────
troxtmodRouter.get("/effects", (_req, res) => {
  res.json({ success: true, count: troxtmodWorld.effects.length, effects: troxtmodWorld.effects });
});

troxtmodRouter.post("/effects", (req, res) => {
  const effect = {
    id:        `effect_${Date.now()}`,
    type:      req.body.type     || "explosion",
    position:  req.body.position || { x:0, y:0, z:0 },
    duration:  req.body.duration || 1,
    metadata:  req.body.metadata || {},
    createdAt: Date.now(),
  };
  troxtmodWorld.effects.push(effect);
  res.status(201).json({ success: true, effect });
  if (effect.duration < 10) {
    setTimeout(() => {
      troxtmodWorld.effects = troxtmodWorld.effects.filter(e => e.id !== effect.id);
    }, effect.duration * 1000);
  }
});

// ─── PLAYERS ──────────────────────────────────────────────────
troxtmodRouter.get("/players", (_req, res) => {
  res.json({ success: true, count: troxtmodWorld.players.size, players: [...troxtmodWorld.players.values()] });
});

// ─── WORLD ────────────────────────────────────────────────────
troxtmodRouter.get("/world", (_req, res) => {
  res.json({
    success: true,
    world: {
      props:     [...troxtmodWorld.props.values()],
      entities:  [...troxtmodWorld.entities.values()],
      platforms: troxtmodWorld.platforms,
      effects:   troxtmodWorld.effects,
      players:   [...troxtmodWorld.players.values()],
      createdAt: troxtmodWorld.createdAt,
      updatedAt: troxtmodWorld.updatedAt,
    },
  });
});

troxtmodRouter.post("/world/clear", (_req, res) => {
  const counts = { props: troxtmodWorld.props.size, entities: troxtmodWorld.entities.size, platforms: troxtmodWorld.platforms.length };
  troxtmodWorld.props.clear();
  troxtmodWorld.entities.clear();
  troxtmodWorld.platforms = [];
  troxtmodWorld.effects   = [];
  troxtmodWorld.updatedAt = Date.now();
  res.json({ success: true, cleared: counts });
});

troxtmodRouter.post("/world/save", (_req, res) => {
  res.json({ success: true, saved: { propsCount: troxtmodWorld.props.size, entitiesCount: troxtmodWorld.entities.size, platformsCount: troxtmodWorld.platforms.length, timestamp: Date.now() } });
});

// ─── ITEMS CATALOG ────────────────────────────────────────────
const PROP_TYPES = new Set([
  "explosive_barrel","wooden_crate","bomb","sign_panel","chair",
  "table","lamp_post","wrecked_car","neon_sign","checkpoint",
  "trampoline","land_mine","portal","shield","drivable_vehicle",
]);

troxtmodRouter.get("/items/catalog", (_req, res) => {
  res.json({
    success: true,
    items: {
      props: [
        { type:"explosive_barrel",  name:"Explosive Barrel",  category:"dangerous",    mass:80,   description:"Explodes on impact" },
        { type:"wooden_crate",      name:"Wooden Crate",      category:"destructible", mass:50,   description:"Destructible container" },
        { type:"bomb",              name:"Timed Bomb",        category:"dangerous",    mass:5,    description:"Timer explosive device" },
        { type:"sign_panel",        name:"Sign Panel",        category:"decorative",   mass:15,   description:"Decorative sign" },
        { type:"chair",             name:"Chair",             category:"furniture",    mass:10,   description:"Interactive furniture" },
        { type:"table",             name:"Table",             category:"furniture",    mass:30,   description:"Interactive furniture" },
        { type:"lamp_post",         name:"Lamp Post",         category:"lighting",     mass:30,   description:"Emissive light source" },
        { type:"wrecked_car",       name:"Wrecked Car",       category:"vehicle",      mass:1200, description:"Damaged vehicle prop" },
        { type:"neon_sign",         name:"Neon Sign",         category:"decorative",   mass:8,    description:"Glowing sign" },
        { type:"checkpoint",        name:"Checkpoint",        category:"interactive",  mass:0,    description:"Save/respawn point" },
        { type:"trampoline",        name:"Trampoline",        category:"interactive",  mass:0,    description:"High bounce surface" },
        { type:"land_mine",         name:"Land Mine",         category:"dangerous",    mass:3,    description:"Proximity explosive" },
        { type:"portal",            name:"Portal",            category:"interactive",  mass:0,    description:"Teleportation device" },
        { type:"shield",            name:"Shield",            category:"protective",   mass:15,   description:"Blocks projectiles" },
        { type:"drivable_vehicle",  name:"Drivable Vehicle",  category:"vehicle",      mass:900,  description:"Physics-based vehicle" },
      ],
      entities: [
        { type:"guard_npc",     name:"Guard NPC",     category:"enemy",    health:200,  description:"Patrols and attacks" },
        { type:"merchant_npc",  name:"Merchant NPC",  category:"friendly", health:50,   description:"Dialogue and trading" },
        { type:"boss_npc",      name:"Boss NPC",      category:"enemy",    health:1000, description:"Multi-phase enemy" },
        { type:"turret",        name:"Turret",        category:"defense",               description:"Auto-targeting defense" },
        { type:"spawn_point",   name:"Spawn Point",   category:"system",                description:"Player spawn location" },
        { type:"vehicle_spawn", name:"Vehicle Spawn", category:"system",                description:"Spawn and manage vehicles" },
        { type:"effect_zone",   name:"Effect Zone",   category:"system",                description:"Apply effects to entities" },
      ],
      tools: [
        { type:"physics_gun",  name:"Physics Gun",  description:"Attract/repulse props" },
        { type:"gravity_gun",  name:"Gravity Gun",  description:"Pick up and launch objects" },
        { type:"weld_tool",    name:"Weld Tool",    description:"Connect two props" },
        { type:"thruster",     name:"Thruster",     description:"Propulse a prop" },
        { type:"rope_tool",    name:"Rope Tool",    description:"Link deux props" },
        { type:"color_tool",   name:"Color Tool",   description:"Change prop color" },
        { type:"delete_tool",  name:"Delete Tool",  description:"Remove prop" },
        { type:"clone_tool",   name:"Clone Tool",   description:"Duplicate prop" },
        { type:"inflater",     name:"Inflater",     description:"Scale up/down a prop" },
        { type:"freezer",      name:"Freezer",      description:"Freeze/unfreeze physics" },
        { type:"spawner",      name:"Spawner Tool", description:"Spawn new props" },
      ],
      effects: [
        { type:"explosion",       name:"Explosion",       description:"Radial force + particules" },
        { type:"fire",            name:"Fire",            description:"Emissive flames + DOTs" },
        { type:"water_pool",      name:"Water Pool",      description:"Slowdown zone" },
        { type:"wind_zone",       name:"Wind Zone",       description:"Directional force" },
        { type:"smoke",           name:"Smoke",           description:"Visibility reduction" },
        { type:"lightning",       name:"Lightning",       description:"Flash + stun" },
        { type:"antigravity_zone",name:"Antigravity Zone",description:"Reverse gravity" },
        { type:"speed_zone",      name:"Speed Zone",      description:"Velocity multiplier" },
        { type:"freeze_zone",     name:"Freeze Zone",     description:"Stop all physics" },
        { type:"vortex",          name:"Vortex",          description:"Pull to center" },
      ],
    },
  });
});

troxtmodRouter.post("/items/spawn", (req, res) => {
  const { type, position, rotation, metadata } = req.body;
  if (!type || !position) return res.status(400).json({ success: false, error: "Type and position required" });

  const item = {
    id:        `item_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    type,
    position,
    rotation:  rotation  || { x:0, y:0, z:0, w:1 },
    scale:     1,
    metadata:  metadata  || {},
    createdAt: Date.now(),
  };

  if (PROP_TYPES.has(type)) troxtmodWorld.props.set(item.id, item);
  else                       troxtmodWorld.entities.set(item.id, item);

  troxtmodWorld.updatedAt = Date.now();
  res.status(201).json({ success: true, item });
});

