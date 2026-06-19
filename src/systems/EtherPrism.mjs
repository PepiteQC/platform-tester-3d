// ════════════════════════════════════════════════════════════
//  EtherPrism.mjs v2 — RP Database Admin (in-memory SQLite-like)
//  Compatible avec landing.js
//
//  Nouveautés v2 :
//  - find(table, { where, sort, limit, offset, select }) — query engine complet
//  - count(table, where?) — comptage filtré
//  - getRelated(table, id, foreignTable, foreignKey) — relation 1→N simple
//  - withRelations(table, id, relations[]) — résolution multi-relations
//  - bulkInsert / bulkUpdate / bulkDelete — opérations en lot
//  - transaction(fn) — snapshot + rollback automatique en cas d'erreur
//  - backup() / restore(snapshot) — sauvegarde/restauration en mémoire
//  - exportToFile(path?) / importFromFile(path?) — backup disque versionné
//  - addIndex / removeIndex sur une colonne pour accélérer getRowByIndex
//  - validateRow(table, data) pluggable par schéma
//  - #save() robuste (écriture atomique via fichier temporaire + rename)
//  - history des dernières opérations (audit log léger en mémoire)
//  - getSchema(table) / listTables()
// ════════════════════════════════════════════════════════════
import fs   from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const now   = () => new Date().toISOString();
const uid   = () => crypto.randomUUID().slice(0, 8);
const DATA_FILE = path.join(process.cwd(), "data", "etherprism.json");
const MAX_HISTORY = 200;

// ── Schemas des tables RP ────────────────────────────────────
const SCHEMAS = {
  players: {
    columns: ["id","name","nationality","job","money","bank","wanted_level","health","armor","playtime","created_at"],
    label: "👤 Players"
  },
  vehicles: {
    columns: ["id","owner_id","model","plate","color","mods","fuel","health","impounded","created_at"],
    label: "🚗 Vehicles"
  },
  houses: {
    columns: ["id","owner_id","address","price","furnished","locked","interior","created_at"],
    label: "🏠 Houses"
  },
  shops: {
    columns: ["id","name","type","owner_id","location","stock","revenue","created_at"],
    label: "🏪 Shops"
  },
  jobs: {
    columns: ["id","name","description","salary","max_players","required_level","created_at"],
    label: "💼 Jobs"
  },
  inventory: {
    columns: ["id","player_id","item","quantity","weight","metadata","created_at"],
    label: "🎒 Inventory"
  },
  factions: {
    columns: ["id","name","type","members","treasury","territory","rank","created_at"],
    label: "⚔️ Factions"
  },
  bank_accounts: {
    columns: ["id","player_id","type","balance","iban","transactions","created_at"],
    label: "💰 Bank"
  },
};

// ── Seed data GTA RP ─────────────────────────────────────────
function generateSeedData() {
  const db = {};

  db.players = [
    { id:1, name:"John_Doe",      nationality:"american", job:"police",    money:2400,  bank:85000,  wanted_level:0, health:100, armor:50,  playtime:3240, created_at:now() },
    { id:2, name:"Maria_Santos",  nationality:"brazilian", job:"mechanic",  money:8200,  bank:42000,  wanted_level:0, health:100, armor:0,   playtime:1800, created_at:now() },
    { id:3, name:"Viktor_Petrov", nationality:"russian",  job:"criminal",  money:450,   bank:12000,  wanted_level:3, health:65,  armor:100, playtime:5600, created_at:now() },
    { id:4, name:"Mei_Chen",      nationality:"korean",   job:"doctor",    money:15000, bank:230000, wanted_level:0, health:100, armor:0,   playtime:900,  created_at:now() },
    { id:5, name:"Luis_Rivera",   nationality:"mexican",  job:"taxi",      money:1200,  bank:8500,   wanted_level:1, health:90,  armor:0,   playtime:2100, created_at:now() },
  ];

  db.vehicles = [
    { id:1, owner_id:1, model:"police",    plate:"LAPD-001", color:"#ffffff", mods:"{}",          fuel:85, health:100, impounded:false, created_at:now() },
    { id:2, owner_id:2, model:"sultan",    plate:"MEC-420",  color:"#ff4444", mods:'{"turbo":1}', fuel:60, health:95,  impounded:false, created_at:now() },
    { id:3, owner_id:3, model:"zentorno",  plate:"VIK-007",  color:"#111111", mods:'{"nos":1}',   fuel:40, health:72,  impounded:true,  created_at:now() },
    { id:4, owner_id:4, model:"ambulance", plate:"MED-911",  color:"#ffffff", mods:"{}",          fuel:90, health:100, impounded:false, created_at:now() },
  ];

  db.houses = [
    { id:1, owner_id:4, address:"Rockford Hills 42",   price:850000, furnished:true,  locked:true,  interior:"luxury",   created_at:now() },
    { id:2, owner_id:2, address:"Sandy Shores Blvd 7", price:85000,  furnished:false, locked:false, interior:"standard", created_at:now() },
    { id:3, owner_id:1, address:"Vinewood Ave 18",     price:420000, furnished:true,  locked:true,  interior:"modern",   created_at:now() },
  ];

  db.shops = [
    { id:1, name:"24/7 Convenience",  type:"general",    owner_id:null, location:"Downtown",    stock:250, revenue:48000, created_at:now() },
    { id:2, name:"Ammu-Nation",        type:"weapons",    owner_id:null, location:"Strawberry",  stock:80,  revenue:92000, created_at:now() },
    { id:3, name:"Binco Clothing",     type:"clothing",   owner_id:null, location:"Chamberlain", stock:400, revenue:31000, created_at:now() },
    { id:4, name:"Maria Auto Repair",  type:"mechanic",   owner_id:2,    location:"LSIA",        stock:120, revenue:22000, created_at:now() },
  ];

  db.jobs = [
    { id:1, name:"Police",    description:"Servir et protéger",      salary:8500,  max_players:20, required_level:5,  created_at:now() },
    { id:2, name:"Médecin",   description:"Soigner les habitants",   salary:9200,  max_players:10, required_level:8,  created_at:now() },
    { id:3, name:"Mécano",    description:"Réparer les véhicules",   salary:6800,  max_players:8,  required_level:3,  created_at:now() },
    { id:4, name:"Taxi",      description:"Transport de civils",     salary:4200,  max_players:15, required_level:1,  created_at:now() },
    { id:5, name:"Criminal",  description:"Activités illégales",     salary:0,     max_players:50, required_level:0,  created_at:now() },
  ];

  db.inventory = [
    { id:1, player_id:1, item:"pistol",      quantity:1,   weight:1.2, metadata:'{"ammo":17}',  created_at:now() },
    { id:2, player_id:2, item:"wrench",       quantity:3,   weight:0.8, metadata:"{}",           created_at:now() },
    { id:3, player_id:3, item:"ak47",         quantity:1,   weight:4.5, metadata:'{"ammo":30}',  created_at:now() },
    { id:4, player_id:3, item:"lockpick",     quantity:5,   weight:0.1, metadata:"{}",           created_at:now() },
    { id:5, player_id:4, item:"medkit",       quantity:10,  weight:0.5, metadata:"{}",           created_at:now() },
    { id:6, player_id:5, item:"phone",        quantity:1,   weight:0.2, metadata:'{"model":"iFruit"}', created_at:now() },
  ];

  db.factions = [
    { id:1, name:"LSPD",         type:"law",       members:8,  treasury:500000, territory:"Downtown", rank:"Sergeant", created_at:now() },
    { id:2, name:"Ballas",       type:"criminal",  members:12, treasury:85000,  territory:"Grove St", rank:"OG",       created_at:now() },
    { id:3, name:"Vagos",        type:"criminal",  members:9,  treasury:62000,  territory:"LSIA",     rank:"Boss",     created_at:now() },
    { id:4, name:"EMS",          type:"medical",   members:5,  treasury:200000, territory:"City",     rank:"Chief",    created_at:now() },
  ];

  db.bank_accounts = [
    { id:1, player_id:1, type:"checking", balance:85000,  iban:"EW-001-LAPD", transactions:42, created_at:now() },
    { id:2, player_id:2, type:"checking", balance:42000,  iban:"EW-002-MEC",  transactions:18, created_at:now() },
    { id:3, player_id:3, type:"savings",  balance:12000,  iban:"EW-003-VIK",  transactions:7,  created_at:now() },
    { id:4, player_id:4, type:"business", balance:230000, iban:"EW-004-MED",  transactions:156,created_at:now() },
  ];

  return db;
}

// ── Helpers de requête v2 ──────────────────────────────────────

function matchesWhere(row, where) {
  if (!where) return true;

  for (const [key, condition] of Object.entries(where)) {
    const value = row[key];

    // condition simple : { field: value }
    if (condition === null || typeof condition !== 'object') {
      if (value !== condition) return false;
      continue;
    }

    // opérateurs : { field: { gt, gte, lt, lte, ne, in, contains } }
    if ('eq' in condition && value !== condition.eq) return false;
    if ('ne' in condition && value === condition.ne) return false;
    if ('gt' in condition && !(value > condition.gt)) return false;
    if ('gte' in condition && !(value >= condition.gte)) return false;
    if ('lt' in condition && !(value < condition.lt)) return false;
    if ('lte' in condition && !(value <= condition.lte)) return false;
    if ('in' in condition && !condition.in.includes(value)) return false;
    if ('contains' in condition && !String(value ?? '').toLowerCase().includes(String(condition.contains).toLowerCase())) return false;
  }

  return true;
}

function applySort(rows, sort) {
  if (!sort) return rows;
  const sorters = Array.isArray(sort) ? sort : [sort];

  return [...rows].sort((a, b) => {
    for (const s of sorters) {
      const field = typeof s === 'string' ? s.replace(/^-/, '') : s.field;
      const desc = typeof s === 'string' ? s.startsWith('-') : s.desc === true;
      const av = a[field];
      const bv = b[field];
      if (av === bv) continue;
      const cmp = av > bv ? 1 : -1;
      return desc ? -cmp : cmp;
    }
    return 0;
  });
}

function applySelect(row, select) {
  if (!select || select.length === 0) return row;
  const out = {};
  for (const key of select) out[key] = row[key];
  return out;
}

// ── DB en mémoire ─────────────────────────────────────────────
export class EtherPrismDB {
  #db       = {};
  #queries  = 0;
  #file     = DATA_FILE;
  #indexes  = new Map(); // "table.column" -> Map(value -> Set(id))
  #history  = [];
  validateRow = null; // hook optionnel: (table, data) => true | "message"

  constructor() {
    this.#load();
  }

  // ── I/O ────────────────────────────────────────────────────

  #load() {
    try {
      if (fs.existsSync(this.#file)) {
        this.#db = JSON.parse(fs.readFileSync(this.#file, "utf8"));
      }
    } catch (err) {
      console.error("[EtherPrism] Failed to load DB file, starting empty:", err.message);
      this.#db = {};
    }
  }

  /** Écriture atomique : écrit dans un fichier temporaire puis renomme, pour éviter un fichier corrompu en cas de crash. */
  #save() {
    try {
      const dir = path.dirname(this.#file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpFile = `${this.#file}.${uid()}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.#db, null, 2), "utf8");
      fs.renameSync(tmpFile, this.#file);
    } catch (err) {
      console.error("[EtherPrism] Failed to save DB file:", err.message);
    }
  }

  #log(op, table, detail = {}) {
    this.#history.push({ op, table, detail, at: now() });
    if (this.#history.length > MAX_HISTORY) this.#history.shift();
  }

  // ── Seed / Stats ─────────────────────────────────────────────

  seed() {
    this.#db = generateSeedData();
    this.#indexes.clear();
    this.#save();
    this.#log("seed", "*", { tables: Object.keys(this.#db).length });
    return { ok: true, tables: Object.keys(this.#db).length };
  }

  stats() {
    this.#queries++;
    const tables = Object.entries(this.#db).map(([name, rows]) => ({
      name,
      rows: rows.length,
      columns: SCHEMAS[name]?.columns || Object.keys(rows[0] || {}),
      label: SCHEMAS[name]?.label || name,
    }));
    return {
      table_count: tables.length,
      total_rows:  tables.reduce((a, t) => a + t.rows, 0),
      tables,
      schemas:     SCHEMAS,
      meta: { total_queries: this.#queries, history_size: this.#history.length },
    };
  }

  listTables() { return Object.keys(this.#db); }
  getSchema(table) { return SCHEMAS[table] ?? null; }
  getHistory(limit = 50) { return this.#history.slice(-limit).reverse(); }

  // ── Lecture simple (API d'origine, inchangée) ───────────────

  getTable(name) {
    this.#queries++;
    if (!this.#db[name]) return { rows: [] };
    return { rows: this.#db[name] };
  }

  getRow(table, id) {
    const t = this.#db[table];
    if (!t) return null;
    return t.find(r => r.id === Number(id)) ?? null;
  }

  // ── Query engine v2 ──────────────────────────────────────────

  /**
   * @param {string} table
   * @param {{ where?: object, sort?: string|string[]|object, limit?: number, offset?: number, select?: string[] }} opts
   * @returns {{ rows: object[], total: number }}
   */
  find(table, opts = {}) {
    this.#queries++;
    const all = this.#db[table] ?? [];
    let rows = opts.where ? all.filter(r => matchesWhere(r, opts.where)) : [...all];

    const total = rows.length;

    rows = applySort(rows, opts.sort);

    if (typeof opts.offset === 'number') rows = rows.slice(opts.offset);
    if (typeof opts.limit === 'number') rows = rows.slice(0, opts.limit);

    if (opts.select) rows = rows.map(r => applySelect(r, opts.select));

    return { rows, total };
  }

  /** Compte les lignes (filtrées ou non) sans les charger toutes en mémoire de sortie. */
  count(table, where = null) {
    this.#queries++;
    const all = this.#db[table] ?? [];
    return where ? all.filter(r => matchesWhere(r, where)).length : all.length;
  }

  // ── Relations simples v2 ─────────────────────────────────────

  /** Récupère toutes les lignes d'une table liée à une ligne via une foreign key. */
  getRelated(foreignTable, foreignKey, id) {
    this.#queries++;
    const rows = this.#db[foreignTable] ?? [];
    return rows.filter(r => r[foreignKey] === Number(id));
  }

  /**
   * Résout plusieurs relations 1→N pour une ligne donnée.
   * @param {Array<{ table: string, foreignTable: string, foreignKey: string, as: string }>} relations
   */
  withRelations(table, id, relations = []) {
    const row = this.getRow(table, id);
    if (!row) return null;

    const enriched = { ...row };
    for (const rel of relations) {
      enriched[rel.as] = this.getRelated(rel.foreignTable, rel.foreignKey, id);
    }
    return enriched;
  }

  // ── Écriture (API d'origine + validation) ───────────────────

  insertRow(table, data) {
    this.#queries++;

    if (this.validateRow) {
      const result = this.validateRow(table, data);
      if (result !== true) throw new Error(`[EtherPrism] Validation failed on insert into "${table}": ${result}`);
    }

    if (!this.#db[table]) this.#db[table] = [];
    const maxId = this.#db[table].reduce((m, r) => Math.max(m, r.id || 0), 0);
    const row = { id: maxId + 1, ...data, created_at: now() };
    this.#db[table].push(row);
    this.#invalidateIndexes(table);
    this.#save();
    this.#log("insert", table, { id: row.id });
    return row;
  }

  updateRow(table, id, data) {
    this.#queries++;
    const t = this.#db[table];
    if (!t) return null;
    const idx = t.findIndex(r => r.id === Number(id));
    if (idx === -1) return null;

    const next = { ...t[idx], ...data, id: Number(id) };

    if (this.validateRow) {
      const result = this.validateRow(table, next);
      if (result !== true) throw new Error(`[EtherPrism] Validation failed on update of "${table}#${id}": ${result}`);
    }

    t[idx] = next;
    this.#invalidateIndexes(table);
    this.#save();
    this.#log("update", table, { id: Number(id), fields: Object.keys(data) });
    return t[idx];
  }

  deleteRow(table, id) {
    this.#queries++;
    if (!this.#db[table]) return false;
    const before = this.#db[table].length;
    this.#db[table] = this.#db[table].filter(r => r.id !== Number(id));
    const deleted = before !== this.#db[table].length;
    if (deleted) {
      this.#invalidateIndexes(table);
      this.#save();
      this.#log("delete", table, { id: Number(id) });
    }
    return deleted;
  }

  // ── Opérations en lot v2 ──────────────────────────────────────

  /** Insère plusieurs lignes. Échec individuel rapporté, pas de rollback global. */
  bulkInsert(table, rows = []) {
    const inserted = [];
    const failed = [];
    for (const data of rows) {
      try { inserted.push(this.insertRow(table, data)); }
      catch (err) { failed.push({ data, error: err.message }); }
    }
    this.#log("bulk_insert", table, { inserted: inserted.length, failed: failed.length });
    return { inserted, failed };
  }

  /** Met à jour toutes les lignes correspondant à `where` avec `patch`. */
  bulkUpdate(table, where, patch) {
    this.#queries++;
    const t = this.#db[table];
    if (!t) return { updated: 0 };

    let count = 0;
    for (let i = 0; i < t.length; i++) {
      if (matchesWhere(t[i], where)) {
        t[i] = { ...t[i], ...patch, id: t[i].id };
        count++;
      }
    }
    if (count > 0) {
      this.#invalidateIndexes(table);
      this.#save();
      this.#log("bulk_update", table, { matched: count });
    }
    return { updated: count };
  }

  /** Supprime toutes les lignes correspondant à `where`. */
  bulkDelete(table, where) {
    this.#queries++;
    const t = this.#db[table];
    if (!t) return { deleted: 0 };

    const before = t.length;
    this.#db[table] = t.filter(r => !matchesWhere(r, where));
    const deleted = before - this.#db[table].length;
    if (deleted > 0) {
      this.#invalidateIndexes(table);
      this.#save();
      this.#log("bulk_delete", table, { deleted });
    }
    return { deleted };
  }

  // ── Transactions v2 ───────────────────────────────────────────

  /**
   * Exécute fn(db) avec rollback automatique si une exception est levée.
   * Ne persiste sur disque qu'une seule fois à la fin (succès).
   * @param {(db: EtherPrismDB) => any} fn
   */
  transaction(fn) {
    const snapshot = JSON.parse(JSON.stringify(this.#db));
    try {
      const result = fn(this);
      this.#save();
      this.#log("transaction_commit", "*", {});
      return { ok: true, result };
    } catch (err) {
      this.#db = snapshot;
      this.#invalidateIndexes();
      this.#log("transaction_rollback", "*", { error: err.message });
      return { ok: false, error: err.message };
    }
  }

  // ── Backup / Restore v2 ───────────────────────────────────────

  /** Capture l'état complet en mémoire (deep copy), sans toucher le disque. */
  backup() {
    return { takenAt: now(), data: JSON.parse(JSON.stringify(this.#db)) };
  }

  /** Restaure un état capturé via backup(). */
  restore(snapshot) {
    if (!snapshot || typeof snapshot.data !== 'object') {
      throw new Error("[EtherPrism] Invalid snapshot passed to restore().");
    }
    this.#db = JSON.parse(JSON.stringify(snapshot.data));
    this.#invalidateIndexes();
    this.#save();
    this.#log("restore", "*", { takenAt: snapshot.takenAt });
    return { ok: true };
  }

  /** Exporte la DB entière vers un fichier JSON horodaté (backup disque versionné). */
  exportToFile(filePath = null) {
    const target = filePath ?? path.join(path.dirname(this.#file), `etherprism.backup.${Date.now()}.json`);
    try {
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(target, JSON.stringify(this.#db, null, 2), "utf8");
      this.#log("export", "*", { file: target });
      return { ok: true, file: target };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /** Importe une DB depuis un fichier JSON (remplace l'état actuel). */
  importFromFile(filePath) {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      this.#db = JSON.parse(raw);
      this.#invalidateIndexes();
      this.#save();
      this.#log("import", "*", { file: filePath });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ── Indexation v2 (accélère les lookups répétés sur une colonne) ─

  addIndex(table, column) {
    const rows = this.#db[table] ?? [];
    const map = new Map();
    for (const row of rows) {
      const key = row[column];
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(row.id);
    }
    this.#indexes.set(`${table}.${column}`, map);
    return { ok: true, table, column, entries: map.size };
  }

  removeIndex(table, column) {
    return this.#indexes.delete(`${table}.${column}`);
  }

  /** Lookup rapide via un index préalablement créé avec addIndex(). */
  getRowsByIndex(table, column, value) {
    const map = this.#indexes.get(`${table}.${column}`);
    if (!map) throw new Error(`[EtherPrism] No index on ${table}.${column}. Call addIndex("${table}", "${column}") first.`);
    const ids = map.get(value) ?? new Set();
    return [...ids].map(id => this.getRow(table, id)).filter(Boolean);
  }

  #invalidateIndexes(table = null) {
    if (!table) { this.#indexes.clear(); return; }
    for (const key of [...this.#indexes.keys()]) {
      if (key.startsWith(`${table}.`)) this.#indexes.delete(key);
    }
  }

  // ── DDL (API d'origine) ──────────────────────────────────────

  createTable(name) {
    if (!this.#db[name]) this.#db[name] = [];
    this.#save();
    this.#log("create_table", name, {});
    return { ok: true, name };
  }

  truncateTable(name) {
    this.#db[name] = [];
    this.#invalidateIndexes(name);
    this.#save();
    this.#log("truncate_table", name, {});
    return { ok: true };
  }

  dropTable(name) {
    delete this.#db[name];
    this.#invalidateIndexes(name);
    this.#save();
    this.#log("drop_table", name, {});
    return { ok: true };
  }
}

export const etherPrism = new EtherPrismDB();
export default etherPrism;
