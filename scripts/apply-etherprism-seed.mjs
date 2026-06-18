import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const seedPath = path.join(root, 'data', 'etherprism', 'seed-city-rp.json')
const dbPath = path.join(root, 'etherprism_db.json')
const requiredTables = ['players', 'vehicles', 'houses', 'shops', 'jobs', 'inventory', 'factions', 'bank_accounts']

function loadJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function uniqueIds(rows, table) {
  const seen = new Set()
  for (const row of rows) {
    assert(row.id !== undefined && row.id !== null, `${table}: row without id`)
    assert(!seen.has(row.id), `${table}: duplicate id ${row.id}`)
    seen.add(row.id)
  }
}

function validate(db) {
  for (const table of requiredTables) {
    assert(Array.isArray(db[table]), `${table} must be an array`)
    uniqueIds(db[table], table)
  }

  const playerIds = new Set(db.players.map((p) => p.id))
  const ref = (table, field) => {
    for (const row of db[table]) {
      if (row[field] !== null && row[field] !== undefined) {
        assert(playerIds.has(row[field]), `${table}#${row.id}: ${field} references missing player ${row[field]}`)
      }
    }
  }

  ref('vehicles', 'owner_id')
  ref('houses', 'owner_id')
  ref('shops', 'owner_id')
  ref('inventory', 'owner_id')
  ref('factions', 'leader_id')
  ref('bank_accounts', 'owner_id')

  assert(db._meta && typeof db._meta === 'object', '_meta is required')
  return {
    ok: true,
    tables: Object.fromEntries(requiredTables.map((table) => [table, db[table].length])),
    version: db._meta.version,
    seed_name: db._meta.seed_name
  }
}

const seed = loadJSON(seedPath)
const result = validate(seed)

if (process.argv.includes('--check')) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

const existing = fs.existsSync(dbPath) ? loadJSON(dbPath) : null
const output = {
  ...seed,
  _meta: {
    ...seed._meta,
    created_at: existing?._meta?.created_at || seed._meta.created_at,
    updated_at: new Date().toISOString(),
    total_queries: existing?._meta?.total_queries ?? seed._meta.total_queries
  }
}

validate(output)
fs.writeFileSync(dbPath, JSON.stringify(output, null, 2), 'utf-8')
console.log(`EtherPrism seed applied: ${dbPath}`)
console.log(JSON.stringify(validate(output), null, 2))
