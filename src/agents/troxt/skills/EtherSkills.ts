// ============================================================
//  ETHERSKILLS.ts — Skills natifs pour contrôler EtherWorld
//  Connecte TroxT à toutes les API REST + WebSocket du serveur.
// ============================================================

import { SkillRegistry, SkillDefinition, SkillContext, SkillResult } from './SkillRegistry'

const API_BASE = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:4100'

async function api(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET', body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function registerAllEtherSkills(registry: SkillRegistry): void {
  // ─── ETHERPRISM (DB) ──────────────────────────────────────
  registry.register({
    id: 'prism_query',
    name: 'EtherPrism Query',
    description: 'Exécuter une requête SELECT sur une table de la DB (players, vehicles, houses, shops, jobs, factions, inventory, bank_accounts).',
    params: { table: 'string', query: 'string' },
    dangerous: false,
    handler: async (params) => {
      const table = params.table as string
      const data = await api(`/api/prism/${table}`)
      return { success: true, summary: `${(data as any).count || '?'} lignes dans ${table}`, detail: data }
    }
  })

  registry.register({
    id: 'prism_insert',
    name: 'EtherPrism Insert',
    description: 'Insérer une ligne dans une table RP (CRUD).',
    params: { table: 'string', data: 'object' },
    dangerous: true,
    handler: async (params) => {
      const data = await api(`/api/prism/${params.table}`, 'POST', params.data)
      return { success: true, summary: `Ligne insérée dans ${params.table}`, detail: data }
    }
  })

  registry.register({
    id: 'prism_update',
    name: 'EtherPrism Update',
    description: 'Modifier une ligne existante par ID.',
    params: { table: 'string', id: 'number', data: 'object' },
    dangerous: true,
    handler: async (params) => {
      const data = await api(`/api/prism/${params.table}/${params.id}`, 'PUT', params.data)
      return { success: true, summary: `Ligne #${params.id} modifiée`, detail: data }
    }
  })

  registry.register({
    id: 'prism_stats',
    name: 'EtherPrism Stats',
    description: 'Obtenir les statistiques globales de la base de données.',
    params: {},
    dangerous: false,
    handler: async () => {
      const data = await api('/api/prism-admin/stats')
      return { success: true, summary: `${(data as any).total_rows || 0} lignes total`, detail: data }
    }
  })

  registry.register({
    id: 'prism_seed',
    name: 'EtherPrism Seed',
    description: 'Remplir la DB avec des données de démonstration RP.',
    params: {},
    dangerous: true,
    handler: async () => {
      const data = await api('/api/prism-admin/seed', 'POST')
      return { success: true, summary: 'DB seedée avec données RP', detail: data }
    }
  })

  // ─── ETHERFORGE (3D) ──────────────────────────────────────
  registry.register({
    id: 'forge_load_platforms',
    name: 'Forge Load Platforms',
    description: 'Charger la liste des plateformes 3D actuelles.',
    params: {},
    dangerous: false,
    handler: async () => {
      const data = await api('/api/platforms')
      return { success: true, summary: `${(data as any).platforms?.length || 0} plateformes chargées`, detail: data }
    }
  })

  registry.register({
    id: 'forge_create_platform',
    name: 'Forge Create Platform',
    description: 'Ajouter une plateforme 3D (type, position, taille, couleur).',
    params: { type: 'string', position: 'array', size: 'array', color: 'string' },
    dangerous: false,
    handler: async (params) => {
      const data = await api('/api/platforms', 'POST', {
        type: params.type || 'static',
        position: params.position || [0, 1, 0],
        size: params.size || [2, 0.4, 2],
        color: params.color || '#6688cc',
        material: 'standard',
        isStatic: true
      })
      return { success: true, summary: `Plateforme créée #${(data as any).platform?.id}`, detail: data }
    }
  })

  registry.register({
    id: 'forge_generate_world',
    name: 'Forge Generate World',
    description: 'Générer un monde procédural avec seed.',
    params: { seed: 'number', count: 'number' },
    dangerous: false,
    handler: async (params) => {
      const data = await api('/api/platforms/generate', 'POST', {
        seed: params.seed ?? Math.floor(Math.random() * 100000),
        count: params.count ?? 30
      })
      return { success: true, summary: `Monde généré (seed: ${(data as any).seed})`, detail: data }
    }
  })

  registry.register({
    id: 'forge_save_level',
    name: 'Forge Save Level',
    description: 'Sauvegarder le niveau actuel avec un nom.',
    params: { name: 'string' },
    dangerous: false,
    handler: async (params) => {
      const data = await api('/api/save', 'POST', { name: params.name || `save_${Date.now()}` })
      return { success: true, summary: `Niveau sauvegardé`, detail: data }
    }
  })

  registry.register({
    id: 'forge_load_level',
    name: 'Forge Load Level',
    description: 'Charger un niveau sauvegardé.',
    params: { name: 'string' },
    dangerous: false,
    handler: async (params) => {
      const data = await api('/api/load', 'POST', { name: params.name })
      return { success: true, summary: `Niveau chargé`, detail: data }
    }
  })

  registry.register({
    id: 'forge_export_gltf',
    name: 'Forge Export GLTF',
    description: 'Exporter le monde au format GLTF.',
    params: {},
    dangerous: false,
    handler: async () => {
      const data = await api('/api/export/gltf')
      return { success: true, summary: 'Export GLTF prêt', detail: data }
    }
  })

  // ─── WORLD ADMIN ────────────────────────────────────────────
  registry.register({
    id: 'world_set_time',
    name: 'World Set Time',
    description: 'Régler l\'heure du monde (0-24).',
    params: { time: 'number' },
    dangerous: false,
    handler: async (params) => {
      const data = await api('/api/admin/world', 'PATCH', { time_of_day: params.time ?? 12 })
      return { success: true, summary: `Heure réglée à ${params.time}h`, detail: data }
    }
  })

  registry.register({
    id: 'world_set_weather',
    name: 'World Set Weather',
    description: 'Changer la météo (sunny, cloudy, rainy, snowy, fog, storm).',
    params: { weather: 'string' },
    dangerous: false,
    handler: async (params) => {
      const weather = (params.weather as string) || 'sunny'
      const data = await api('/api/admin/world', 'PATCH', { weather })
      return { success: true, summary: `Météo : ${weather}`, detail: data }
    }
  })

  registry.register({
    id: 'world_get_state',
    name: 'World Get State',
    description: 'Obtenir l\'état complet du monde (heure, météo, joueurs).',
    params: {},
    dangerous: false,
    handler: async () => {
      const data = await api('/api/admin/world')
      return { success: true, summary: `État monde OK`, detail: data }
    }
  })

  // ─── ADMIN / SERVER ───────────────────────────────────────
  registry.register({
    id: 'admin_list_players',
    name: 'Admin List Players',
    description: 'Liste des joueurs en ligne avec métriques.',
    params: {},
    dangerous: false,
    handler: async () => {
      const data = await api('/api/admin/players')
      return { success: true, summary: `${(data as any).players?.length || 0} joueurs`, detail: data }
    }
  })

  registry.register({
    id: 'admin_kick_player',
    name: 'Admin Kick Player',
    description: 'Expulser un joueur par ID.',
    params: { playerId: 'string', reason: 'string' },
    dangerous: true,
    handler: async (params) => {
      const data = await api(`/api/admin/players/${params.playerId}/kick`, 'POST', { reason: params.reason || 'Admin' })
      return { success: true, summary: `Joueur ${params.playerId} expulsé`, detail: data }
    }
  })

  registry.register({
    id: 'admin_teleport_player',
    name: 'Admin Teleport Player',
    description: 'Téléporter un joueur à des coordonnées.',
    params: { playerId: 'string', position: 'array' },
    dangerous: true,
    handler: async (params) => {
      const data = await api(`/api/admin/players/${params.playerId}/teleport`, 'POST', { position: params.position || [0, 5, 0] })
      return { success: true, summary: `Téléportation effectuée`, detail: data }
    }
  })

  registry.register({
    id: 'admin_create_snapshot',
    name: 'Admin Create Snapshot',
    description: 'Créer un snapshot du monde.',
    params: { type: 'string', description: 'string' },
    dangerous: false,
    handler: async (params) => {
      const data = await api('/api/admin/snapshots', 'POST', {
        type: params.type || 'manual',
        description: params.description || 'Snapshot by TroxT'
      })
      return { success: true, summary: `Snapshot créé`, detail: data }
    }
  })

  registry.register({
    id: 'admin_restore_snapshot',
    name: 'Admin Restore Snapshot',
    description: 'Restaurer un snapshot par ID.',
    params: { snapshotId: 'string' },
    dangerous: true,
    handler: async (params) => {
      const data = await api(`/api/admin/snapshots/${params.snapshotId}/restore`, 'POST')
      return { success: true, summary: 'Snapshot restauré', detail: data }
    }
  })

  registry.register({
    id: 'admin_server_control',
    name: 'Admin Server Control',
    description: 'Pause, resume, save, backup du serveur.',
    params: { action: 'string' },
    dangerous: true,
    handler: async (params) => {
      const action = (params.action as string) || 'save'
      const data = await api(`/api/admin/server/${action}`, 'POST')
      return { success: true, summary: `Action ${action} exécutée`, detail: data }
    }
  })

  registry.register({
    id: 'admin_metrics',
    name: 'Admin Metrics',
    description: 'Obtenir les métriques serveur (RAM, uptime, joueurs).',
    params: {},
    dangerous: false,
    handler: async () => {
      const data = await api('/api/admin/metrics')
      return { success: true, summary: `RAM: ${(data as any).memory?.percent}%, Uptime: ${(data as any).uptime_formatted}`, detail: data }
    }
  })

  // ─── ETHERLENS (Analyse) ──────────────────────────────────
  registry.register({
    id: 'lens_ocr_scan',
    name: 'Lens OCR Scan',
    description: 'Lancer un scan OCR sur une image ou un canvas.',
    params: { target: 'string' },
    dangerous: false,
    handler: async (params, ctx) => {
      ctx.emit('lens.request', { action: 'ocr', target: params.target })
      return { success: true, summary: 'Analyse OCR demandée', detail: { target: params.target } }
    }
  })

  registry.register({
    id: 'lens_measure',
    name: 'Lens Precision Measure',
    description: 'Mesurer une distance ou un objet dans la scène.',
    params: { from: 'array', to: 'array' },
    dangerous: false,
    handler: async (params, ctx) => {
      ctx.emit('lens.request', { action: 'measure', from: params.from, to: params.to })
      return { success: true, summary: 'Mesure en cours', detail: params }
    }
  })

  // ─── ETHERWEAVE (Textures) ──────────────────────────────────
  registry.register({
    id: 'weave_generate_noise',
    name: 'Weave Noise Pattern',
    description: 'Générer une texture bruit procédurale (PNG/WebP).',
    params: { type: 'string', size: 'number', seed: 'number' },
    dangerous: false,
    handler: async (params, ctx) => {
      ctx.emit('weave.request', {
        action: 'generate',
        pattern: params.type || 'perlin',
        size: params.size || 512,
        seed: params.seed ?? Date.now()
      })
      return { success: true, summary: `Texture ${params.type} générée`, detail: params }
    }
  })

  // ─── META / UTILS ─────────────────────────────────────────
  registry.register({
    id: 'code_generate_snippet',
    name: 'Code Generate Snippet',
    description: 'Générer un snippet de code pour une tâche donnée.',
    params: { language: 'string', task: 'string' },
    dangerous: false,
    handler: async (params) => {
      const lang = (params.language as string) || 'typescript'
      const task = (params.task as string) || 'function hello()'
      const snippet = `// TroxT generated (${lang})\n// Task: ${task}\n\n// TODO: implement\nconsole.log('TroxT was here');`
      return { success: true, summary: `Snippet ${lang} généré`, detail: { code: snippet } }
    }
  })

  registry.register({
    id: 'help_modules',
    name: 'Help Modules',
    description: 'Lister les modules et skills disponibles.',
    params: {},
    dangerous: false,
    handler: async (_params, ctx) => {
      const list = ctx.bridge.getChannels().map((c: { moduleId: string; isConnected: boolean }) => `${c.moduleId} (${c.isConnected ? 'on' : 'off'})`).join(', ')
      return { success: true, summary: `Modules: ${list}`, detail: { modules: list } }
    }
  })
}

export default registerAllEtherSkills
