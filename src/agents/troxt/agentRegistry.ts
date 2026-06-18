// ============================================================
//  TROXT AGENT REGISTRY — WorldSense / AutoBuilder / MotionPilot / MetaAgent
//  Registre additif seulement : aucun branchement automatique.
// ============================================================

export type EtherAgentId = 'world-sense' | 'auto-builder' | 'motion-pilot' | 'meta-agent'
export type EtherAgentRisk = 'safe' | 'requires-confirmation' | 'destructive'
export type EtherAgentStatus = 'ready' | 'offline' | 'running' | 'error'

export interface EtherAgentDefinition {
  id: EtherAgentId
  name: string
  role: string
  impact: string
  summary: string
  capabilities: string[]
  reads: string[]
  writes: string[]
  risk: EtherAgentRisk
  defaultEnabled: boolean
}

export interface EtherAgentRuntimeContext {
  activeModule?: string
  prompt?: string
  payload?: Record<string, unknown>
  allowMutations?: boolean
  signal?: AbortSignal
  fetcher?: typeof fetch
}

export interface EtherAgentObservation {
  label: string
  value: string | number | boolean
  severity?: 'info' | 'success' | 'warning' | 'error'
}

export interface EtherAgentAction {
  id: string
  label: string
  description: string
  command?: string
  endpoint?: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload?: unknown
  requiresConfirmation: boolean
}

export interface EtherAgentRunResult {
  agentId: EtherAgentId
  status: EtherAgentStatus
  title: string
  summary: string
  observations: EtherAgentObservation[]
  actions: EtherAgentAction[]
  data?: unknown
  startedAt: number
  finishedAt: number
}

interface PlatformPayload {
  platforms?: Array<{
    id: number
    type?: string
    position?: [number, number, number]
    size?: [number, number, number]
  }>
  playerCount?: number
}

interface MetricsPayload {
  player_count?: number
  platform_count?: number
  uptime_formatted?: string
  server_status?: string
  snapshot_count?: number
  memory?: { percent?: number; used_mb?: number; total_mb?: number }
}

export const ETHER_AGENTS: Record<EtherAgentId, EtherAgentDefinition> = {
  'world-sense': {
    id: 'world-sense',
    name: 'WorldSense',
    role: 'Comprendre la scène',
    impact: 'Debug & analyse',
    summary: 'Analyse l’état du monde, les métriques serveur, les plateformes, les joueurs et les signaux faibles.',
    capabilities: [
      'Lire les métriques serveur',
      'Analyser le nombre de plateformes et joueurs',
      'Détecter les risques mémoire ou serveur',
      'Produire un résumé de scène exploitable par TroxT'
    ],
    reads: ['/api/admin/metrics', '/api/platforms'],
    writes: [],
    risk: 'safe',
    defaultEnabled: true
  },
  'auto-builder': {
    id: 'auto-builder',
    name: 'AutoBuilder',
    role: 'Construire des objets',
    impact: 'Génération rapide',
    summary: 'Génère des plans d’objets 3D et peut préparer des payloads compatibles avec le Platform Tester.',
    capabilities: [
      'Créer des plans de plateformes',
      'Proposer des objets de décor',
      'Préparer des payloads POST /api/platforms',
      'Respecter un mode lecture seule par défaut'
    ],
    reads: ['/api/platforms'],
    writes: ['/api/platforms'],
    risk: 'requires-confirmation',
    defaultEnabled: true
  },
  'motion-pilot': {
    id: 'motion-pilot',
    name: 'MotionPilot',
    role: 'Tester les déplacements',
    impact: 'Pathfinding & physique',
    summary: 'Analyse la jouabilité des plateformes, les distances, hauteurs et zones potentiellement difficiles.',
    capabilities: [
      'Analyser les gaps entre plateformes',
      'Détecter les sauts difficiles',
      'Estimer une route de progression',
      'Signaler les risques de chute ou de blocage'
    ],
    reads: ['/api/platforms'],
    writes: [],
    risk: 'safe',
    defaultEnabled: true
  },
  'meta-agent': {
    id: 'meta-agent',
    name: 'MetaAgent',
    role: 'Superviseur',
    impact: 'Optimisation',
    summary: 'Coordonne les autres agents, agrège leurs diagnostics et priorise les actions utiles.',
    capabilities: [
      'Orchestrer WorldSense, AutoBuilder et MotionPilot',
      'Classer les recommandations par impact',
      'Détecter les conflits entre génération et jouabilité',
      'Préparer un rapport d’optimisation global'
    ],
    reads: ['/api/admin/metrics', '/api/platforms'],
    writes: [],
    risk: 'safe',
    defaultEnabled: true
  }
}

function getFetch(context: EtherAgentRuntimeContext): typeof fetch {
  return context.fetcher || fetch
}

async function readJson<T>(path: string, context: EtherAgentRuntimeContext): Promise<T | null> {
  try {
    const res = await getFetch(context)(path, {
      signal: context.signal,
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

function distance3(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function finish(
  agentId: EtherAgentId,
  startedAt: number,
  result: Omit<EtherAgentRunResult, 'agentId' | 'startedAt' | 'finishedAt'>
): EtherAgentRunResult {
  return {
    agentId,
    startedAt,
    finishedAt: Date.now(),
    ...result
  }
}

async function runWorldSense(context: EtherAgentRuntimeContext): Promise<EtherAgentRunResult> {
  const startedAt = Date.now()
  const [metrics, platforms] = await Promise.all([
    readJson<MetricsPayload>('/api/admin/metrics', context),
    readJson<PlatformPayload>('/api/platforms', context)
  ])

  const memoryPercent = Number(metrics?.memory?.percent || 0)
  const platformCount = Number(metrics?.platform_count ?? platforms?.platforms?.length ?? 0)
  const playerCount = Number(metrics?.player_count ?? platforms?.playerCount ?? 0)
  const status = String(metrics?.server_status || 'unknown')

  const observations: EtherAgentObservation[] = [
    { label: 'Serveur', value: status, severity: status === 'running' ? 'success' : 'warning' },
    { label: 'Joueurs', value: playerCount, severity: playerCount > 0 ? 'success' : 'info' },
    { label: 'Plateformes', value: platformCount, severity: platformCount > 0 ? 'success' : 'warning' },
    { label: 'Mémoire', value: `${memoryPercent}%`, severity: memoryPercent > 80 ? 'error' : memoryPercent > 60 ? 'warning' : 'success' },
    { label: 'Snapshots', value: Number(metrics?.snapshot_count || 0), severity: 'info' }
  ]

  const actions: EtherAgentAction[] = []
  if (memoryPercent > 75) {
    actions.push({
      id: 'suggest-snapshot-before-cleanup',
      label: 'Créer un snapshot avant optimisation',
      description: 'La mémoire est élevée. Sauvegarder l’état avant toute opération lourde.',
      command: 'troxtAdmin.execute("backup Snapshot WorldSense")',
      endpoint: '/api/admin/snapshots',
      method: 'POST',
      requiresConfirmation: false
    })
  }

  return finish('world-sense', startedAt, {
    status: metrics || platforms ? 'ready' : 'offline',
    title: 'WorldSense — Analyse scène',
    summary: `Monde ${status}, ${platformCount} plateformes, ${playerCount} joueurs, mémoire ${memoryPercent}%.`,
    observations,
    actions,
    data: { metrics, platforms }
  })
}

async function runAutoBuilder(context: EtherAgentRuntimeContext): Promise<EtherAgentRunResult> {
  const startedAt = Date.now()
  const platforms = await readJson<PlatformPayload>('/api/platforms', context)
  const count = Number(platforms?.platforms?.length || 0)
  const baseY = 3 + Math.min(8, Math.floor(count / 8))

  const blueprint = [
    { type: 'static', position: [0, baseY, 8], size: [3, 0.4, 3], color: '#7dd3fc', material: 'standard', isStatic: true },
    { type: 'bouncy', position: [3.8, baseY + 1.1, 9.2], size: [2, 0.4, 2], color: '#44cc88', material: 'standard', isStatic: false, bounceForce: 16 },
    { type: 'moving', position: [7.2, baseY + 2.1, 10], size: [2.8, 0.35, 2.8], color: '#c9a84c', material: 'standard', isStatic: false, movement: { axis: 'x', amplitude: 2.4, speed: 0.9 } }
  ]

  const actions: EtherAgentAction[] = blueprint.map((payload, index) => ({
    id: `create-platform-${index + 1}`,
    label: `Préparer ${payload.type}`,
    description: `Payload prêt pour créer une plateforme ${payload.type}.`,
    endpoint: '/api/platforms',
    method: 'POST',
    payload,
    requiresConfirmation: true
  }))

  if (context.allowMutations) {
    for (const action of actions) {
      await getFetch(context)(action.endpoint!, {
        method: action.method,
        signal: context.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload)
      })
    }
  }

  return finish('auto-builder', startedAt, {
    status: 'ready',
    title: 'AutoBuilder — Génération rapide',
    summary: context.allowMutations
      ? 'Blueprint généré et envoyé au serveur.'
      : 'Blueprint généré en mode sûr. Aucune mutation appliquée sans confirmation.',
    observations: [
      { label: 'Plateformes existantes', value: count, severity: 'info' },
      { label: 'Objets proposés', value: blueprint.length, severity: 'success' },
      { label: 'Mode mutation', value: Boolean(context.allowMutations), severity: context.allowMutations ? 'warning' : 'success' }
    ],
    actions,
    data: { blueprint }
  })
}

async function runMotionPilot(context: EtherAgentRuntimeContext): Promise<EtherAgentRunResult> {
  const startedAt = Date.now()
  const platforms = await readJson<PlatformPayload>('/api/platforms', context)
  const list = platforms?.platforms || []
  const sorted = list
    .filter(p => Array.isArray(p.position))
    .sort((a, b) => (a.position?.[1] || 0) - (b.position?.[1] || 0))

  let maxGap = 0
  let steepJumps = 0
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].position!
    const curr = sorted[i].position!
    const gap = distance3(prev, curr)
    maxGap = Math.max(maxGap, gap)
    if (Math.abs(curr[1] - prev[1]) > 3.2 || gap > 9) steepJumps++
  }

  const severity = steepJumps > 8 ? 'warning' : 'success'
  return finish('motion-pilot', startedAt, {
    status: platforms ? 'ready' : 'offline',
    title: 'MotionPilot — Pathfinding & physique',
    summary: `${sorted.length} plateformes analysées. Gap max ${maxGap.toFixed(1)}. Segments difficiles: ${steepJumps}.`,
    observations: [
      { label: 'Plateformes analysées', value: sorted.length, severity: sorted.length ? 'success' : 'warning' },
      { label: 'Gap max', value: maxGap.toFixed(1), severity: maxGap > 10 ? 'warning' : 'success' },
      { label: 'Sauts difficiles', value: steepJumps, severity }
    ],
    actions: steepJumps > 0 ? [{
      id: 'suggest-autobuilder-bridges',
      label: 'Demander ponts AutoBuilder',
      description: 'Créer des plateformes intermédiaires pour réduire les gaps et stabiliser le parcours.',
      command: 'runEtherAgent("auto-builder")',
      requiresConfirmation: false
    }] : [],
    data: { maxGap, steepJumps, analyzed: sorted.length }
  })
}

async function runMetaAgent(context: EtherAgentRuntimeContext): Promise<EtherAgentRunResult> {
  const startedAt = Date.now()
  const [world, motion, builder] = await Promise.all([
    runWorldSense(context),
    runMotionPilot(context),
    runAutoBuilder({ ...context, allowMutations: false })
  ])

  const allActions = [...world.actions, ...motion.actions, ...builder.actions]
  const warnings = [...world.observations, ...motion.observations, ...builder.observations]
    .filter(o => o.severity === 'warning' || o.severity === 'error')

  return finish('meta-agent', startedAt, {
    status: 'ready',
    title: 'MetaAgent — Supervision',
    summary: `Supervision terminée: ${warnings.length} alertes, ${allActions.length} actions proposées.`,
    observations: [
      { label: 'Agents consultés', value: 3, severity: 'success' },
      { label: 'Alertes', value: warnings.length, severity: warnings.length ? 'warning' : 'success' },
      { label: 'Actions proposées', value: allActions.length, severity: allActions.length ? 'info' : 'success' }
    ],
    actions: allActions,
    data: { world, motion, builder }
  })
}

export async function runEtherAgent(id: EtherAgentId, context: EtherAgentRuntimeContext = {}): Promise<EtherAgentRunResult> {
  switch (id) {
    case 'world-sense': return runWorldSense(context)
    case 'auto-builder': return runAutoBuilder(context)
    case 'motion-pilot': return runMotionPilot(context)
    case 'meta-agent': return runMetaAgent(context)
  }
}

export function listEtherAgents(): EtherAgentDefinition[] {
  return Object.values(ETHER_AGENTS)
}

export function getEtherAgent(id: EtherAgentId): EtherAgentDefinition {
  return ETHER_AGENTS[id]
}

export default ETHER_AGENTS
