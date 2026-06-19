// ============================================================================
//  EtherWorld — Audit Store v2
//  Chemin : stores/auditStore.ts
//
//  Nouveautés v2 :
//  - Persistance localStorage (état complet entre sessions)
//  - Historique des audits (jusqu'à 20 entrées)
//  - Sélecteurs dérivés mémorisés (score, stats mutants, résumé)
//  - Export JSON de rapport complet
//  - Import d'un audit sauvegardé
//  - Retry automatique configurable sur erreur réseau
//  - setMutantStatus pour mise à jour granulaire
//  - Action rejouer un audit depuis l'historique
// ============================================================================

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ============================================================================
// Types généraux
// ============================================================================

export type AuditFramework =
  | 'foundry'
  | 'hardhat'
  | 'truffle'
  | (string & {})

export type AuditOperator =
  | 'BCR'
  | 'AOR'
  | 'BLR'
  | 'ROR'
  | 'LCR'
  | 'UOD'
  | (string & {})

export type AuditPhase =
  | 'idle'
  | 'compiling'
  | 'analyzing'
  | 'generating-mutants'
  | 'running'
  | 'done'
  | 'failed'
  | 'cancelled'

export type AuditWsStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export type MutantStatus =
  | 'pending'
  | 'running'
  | 'killed'
  | 'survived'
  | 'timeout'
  | 'error'
  | 'skipped'
  | (string & {})

export interface AuditProgress {
  phase: AuditPhase
  current: number
  total: number
  percent: number
  message: string | null
  startedAt: number | null
  finishedAt: number | null
}

export interface CompilationResult extends Record<string, unknown> {
  success?: boolean
  compilerVersion?: string
  abi?: unknown[]
  bytecode?: string
  deployedBytecode?: string
  warnings?: string[]
  errors?: string[]
}

export interface AuditFinding extends Record<string, unknown> {
  id?: string
  title?: string
  description?: string
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info' | string
  category?: string
  line?: number
  column?: number
  recommendation?: string
}

export interface AuditAnalysis extends Record<string, unknown> {
  score?: number
  summary?: string
  findings?: AuditFinding[]
  warnings?: string[]
  metrics?: Record<string, unknown>
}

export interface AuditMutant extends Record<string, unknown> {
  id: string
  operator: string
  status: MutantStatus
  fileName?: string
  line?: number
  column?: number
  original?: string
  replacement?: string
  sourceCode?: string
  durationMs?: number
  error?: string
}

export interface AuditReport extends Record<string, unknown> {
  score?: number
  mutationScore?: number
  total?: number
  killed?: number
  survived?: number
  timeout?: number
  errors?: number
  generatedAt?: number | string
}

export interface AuditPipelineResult {
  compiled: CompilationResult
  analysis: AuditAnalysis
  mutants: AuditMutant[]
}

export interface AuditWsMessage {
  event: string
  data?: unknown
}

// ============================================================================
// Types nouveaux v2
// ============================================================================

export interface AuditHistoryEntry {
  id: string
  fileName: string
  framework: AuditFramework
  operators: AuditOperator[]
  sourceCode: string
  compiled: CompilationResult | null
  analysis: AuditAnalysis | null
  mutants: AuditMutant[]
  report: AuditReport | null
  auditedAt: number
  durationMs: number | null
  summary: AuditSummary
}

export interface AuditSummary {
  score: number | null
  mutationScore: number | null
  totalFindings: number
  criticalFindings: number
  highFindings: number
  killedMutants: number
  survivedMutants: number
  totalMutants: number
  compilationSuccess: boolean
}

export interface AuditExport {
  version: '2'
  exportedAt: number
  fileName: string
  framework: AuditFramework
  operators: AuditOperator[]
  sourceCode: string
  compiled: CompilationResult | null
  analysis: AuditAnalysis | null
  mutants: AuditMutant[]
  report: AuditReport | null
  summary: AuditSummary
}

type RequestKind = 'compile' | 'analyze' | 'mutate'

// ============================================================================
// Interface complète du store
// ============================================================================

export interface AuditStore {
  // Inputs
  sourceCode: string
  fileName: string
  framework: AuditFramework
  operators: AuditOperator[]
  retryOnNetworkError: boolean

  // Résultats
  compiled: CompilationResult | null
  analysis: AuditAnalysis | null
  mutants: AuditMutant[]
  report: AuditReport | null

  // Progression
  progress: AuditProgress

  // Statuts
  error: string | null
  wsError: string | null
  wsStatus: AuditWsStatus
  isCompiling: boolean
  isAnalyzing: boolean
  isGeneratingMutants: boolean
  isPipelineRunning: boolean

  // Historique v2
  history: AuditHistoryEntry[]

  // ── Setters inputs
  setSourceCode: (value: string) => void
  setFileName: (value: string) => void
  setFramework: (value: AuditFramework) => void
  setOperators: (value: AuditOperator[]) => void
  setRetryOnNetworkError: (value: boolean) => void

  // ── Clearing
  clearError: () => void
  clearReport: () => void
  clearResults: () => void

  // ── Actions métier
  compile: () => Promise<CompilationResult>
  analyze: () => Promise<AuditAnalysis>
  generateMutants: () => Promise<AuditMutant[]>
  runFullAudit: () => Promise<AuditPipelineResult>
  cancelActiveRequests: () => void

  // ── Mutant granulaire v2
  setMutantStatus: (id: string, status: MutantStatus, patch?: Partial<AuditMutant>) => void

  // ── Historique v2
  saveToHistory: () => void
  clearHistory: () => void
  removeHistoryEntry: (id: string) => void
  replayFromHistory: (id: string) => void

  // ── Export / Import v2
  exportCurrentAudit: () => AuditExport | null
  importAudit: (data: unknown) => void

  // ── Sélecteurs dérivés v2
  getSummary: () => AuditSummary
  getMutantsByStatus: (status: MutantStatus) => AuditMutant[]
  getFindingsBySeverity: (severity: string) => AuditFinding[]

  // ── WebSocket
  connectWebSocket: (url?: string) => void
  disconnectWebSocket: () => void
  handleWsEvent: (message: unknown) => void

  // ── Reset
  resetAudit: () => void
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_FILE_NAME = 'MyContract.sol'
const DEFAULT_FRAMEWORK: AuditFramework = 'foundry'
const DEFAULT_OPERATORS: AuditOperator[] = ['BCR', 'AOR', 'BLR']
const DEFAULT_WS_PATH = '/api/audit/ws'
const MAX_HISTORY_ENTRIES = 20
const MAX_RECONNECT_ATTEMPTS = 10
const BASE_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 30_000
const MAX_RETRY_ATTEMPTS = 2

// ============================================================================
// État technique externe au store
// ============================================================================

const requestControllers = new Map<RequestKind, AbortController>()
let activeSocket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let socketWasClosedManually = false
let lastWebSocketUrl = DEFAULT_WS_PATH

// ============================================================================
// Helpers généraux
// ============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function normalizeError(error: unknown, fallback = 'Une erreur inconnue est survenue.'): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  if (isRecord(error)) {
    const msg = error.message ?? error.error ?? error.detail ?? error.reason
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

function normalizeFileName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_FILE_NAME
  return trimmed.endsWith('.sol') ? trimmed : `${trimmed}.sol`
}

function normalizeOperators(operators: readonly AuditOperator[]): AuditOperator[] {
  const normalized = operators.map(op => String(op).trim()).filter(Boolean)
  return [...new Set(normalized)] as AuditOperator[]
}

function validateAuditInput(sourceCode: string, fileName: string): void {
  if (!sourceCode.trim()) throw new Error('Le code source Solidity est vide. Ajoute un contrat avant de lancer l\'audit.')
  if (!fileName.trim()) throw new Error('Le nom du fichier Solidity est obligatoire.')
}

function generateId(prefix = 'entry'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createProgress(
  phase: AuditPhase,
  options: {
    current?: number
    total?: number
    message?: string | null
    startedAt?: number | null
    finishedAt?: number | null
  } = {},
): AuditProgress {
  const current = Math.max(0, options.current ?? 0)
  const total = Math.max(0, options.total ?? 0)
  const percent = total > 0
    ? Math.min(100, Math.round((current / total) * 100))
    : phase === 'done' ? 100 : 0

  return {
    phase, current, total, percent,
    message: options.message ?? null,
    startedAt: options.startedAt ?? null,
    finishedAt: options.finishedAt ?? null,
  }
}

function createInitialProgress(): AuditProgress {
  return createProgress('idle')
}

function createRequestController(kind: RequestKind): AbortController {
  requestControllers.get(kind)?.abort()
  const controller = new AbortController()
  requestControllers.set(kind, controller)
  return controller
}

function isCurrentRequest(kind: RequestKind, controller: AbortController): boolean {
  return requestControllers.get(kind) === controller
}

function releaseRequestController(kind: RequestKind, controller: AbortController): void {
  if (isCurrentRequest(kind, controller)) requestControllers.delete(kind)
}

function abortAllRequests(): void {
  requestControllers.forEach(c => c.abort())
  requestControllers.clear()
}

// ============================================================================
// Client HTTP robuste avec retry v2
// ============================================================================

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text.trim()) return null
  try { return JSON.parse(text) } catch { return text }
}

function extractApiError(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (isRecord(payload)) {
    const msg = payload.error ?? payload.message ?? payload.detail ?? payload.reason
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

async function postJson(
  url: string,
  body: unknown,
  signal: AbortSignal,
  retryAttempts = 0,
): Promise<unknown> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
        signal,
      })
      const payload = await readResponseBody(response)
      if (!response.ok) {
        throw new Error(extractApiError(payload, `La requête ${url} a échoué avec le statut HTTP ${response.status}.`))
      }
      return payload
    } catch (error) {
      if (isAbortError(error)) throw error

      lastError = error
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch')

      if (!isNetworkError || attempt >= retryAttempts) throw error

      // Backoff exponentiel entre les retries
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt))
    }
  }

  throw lastError
}

// ============================================================================
// Extraction et normalisation des réponses API
// ============================================================================

function extractCompilationResult(payload: unknown): CompilationResult {
  if (!isRecord(payload)) throw new Error('La réponse de compilation possède un format invalide.')
  const candidate = isRecord(payload.compiled) ? payload.compiled : payload
  return candidate as CompilationResult
}

function normalizeFinding(value: unknown): AuditFinding | null {
  if (!isRecord(value)) return null
  return value as AuditFinding
}

function extractAnalysis(payload: unknown): AuditAnalysis {
  if (!isRecord(payload)) throw new Error('La réponse d\'analyse possède un format invalide.')
  const candidate = isRecord(payload.analysis) ? payload.analysis : payload
  const findings = Array.isArray(candidate.findings)
    ? candidate.findings.map(normalizeFinding).filter((f): f is AuditFinding => f !== null)
    : undefined
  return { ...candidate, ...(findings ? { findings } : {}) } as AuditAnalysis
}

function normalizeMutant(value: unknown, fallbackIndex = 0): AuditMutant | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' && value.id.trim() ? value.id : `mutant_${fallbackIndex}_${Date.now()}`
  const operator = typeof value.operator === 'string' && value.operator.trim() ? value.operator : 'UNKNOWN'
  const status = typeof value.status === 'string' && value.status.trim() ? value.status : 'pending'
  return { ...value, id, operator, status } as AuditMutant
}

function extractMutants(payload: unknown): AuditMutant[] {
  const raw = Array.isArray(payload) ? payload
    : isRecord(payload) && Array.isArray(payload.mutants) ? payload.mutants
    : null
  if (!raw) throw new Error('La réponse de mutation ne contient aucun tableau "mutants".')
  return raw.map((m, i) => normalizeMutant(m, i)).filter((m): m is AuditMutant => m !== null)
}

function extractReport(payload: unknown): AuditReport | null {
  if (!isRecord(payload)) return null
  const candidate = isRecord(payload.report) ? payload.report : payload
  return candidate as AuditReport
}

// ============================================================================
// Calcul du résumé dérivé v2
// ============================================================================

function computeSummary(
  compiled: CompilationResult | null,
  analysis: AuditAnalysis | null,
  mutants: AuditMutant[],
  report: AuditReport | null,
): AuditSummary {
  const findings = analysis?.findings ?? []
  const killed = mutants.filter(m => m.status === 'killed').length
  const survived = mutants.filter(m => m.status === 'survived').length

  const mutationScore = report?.mutationScore
    ?? (mutants.length > 0 ? Math.round((killed / mutants.length) * 100) : null)

  return {
    score: analysis?.score ?? report?.score ?? null,
    mutationScore: typeof mutationScore === 'number' ? mutationScore : null,
    totalFindings: findings.length,
    criticalFindings: findings.filter(f => f.severity === 'critical').length,
    highFindings: findings.filter(f => f.severity === 'high').length,
    killedMutants: killed,
    survivedMutants: survived,
    totalMutants: mutants.length,
    compilationSuccess: compiled?.success === true,
  }
}

// ============================================================================
// WebSocket
// ============================================================================

function clearReconnectTimer(): void {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
}

function resolveWebSocketUrl(pathOrUrl: string): string {
  if (/^wss?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl.replace(/^http/i, 'ws')
  if (typeof window === 'undefined') return pathOrUrl
  const resolved = new URL(pathOrUrl, window.location.href)
  resolved.protocol = resolved.protocol === 'https:' ? 'wss:' : 'ws:'
  return resolved.toString()
}

function parseWsMessage(message: unknown): AuditWsMessage | null {
  let parsed = message
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { return null }
  }
  if (!isRecord(parsed)) return null
  if (typeof parsed.event !== 'string' || !parsed.event.trim()) return null
  return { event: parsed.event, data: parsed.data }
}

function readNumber(record: Record<string, unknown>, key: string, fallback: number): number {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

// ============================================================================
// Store Zustand avec persistence v2
// ============================================================================

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      // ── State initial
      sourceCode: '',
      fileName: DEFAULT_FILE_NAME,
      framework: DEFAULT_FRAMEWORK,
      operators: [...DEFAULT_OPERATORS],
      retryOnNetworkError: true,

      compiled: null,
      analysis: null,
      mutants: [],
      report: null,

      progress: createInitialProgress(),
      error: null,
      wsError: null,
      wsStatus: 'disconnected' as AuditWsStatus,
      isCompiling: false,
      isAnalyzing: false,
      isGeneratingMutants: false,
      isPipelineRunning: false,

      history: [],

      // ── Setters inputs

      setSourceCode: value => {
        abortAllRequests()
        set({
          sourceCode: value,
          compiled: null, analysis: null, mutants: [], report: null,
          error: null, progress: createInitialProgress(),
          isCompiling: false, isAnalyzing: false,
          isGeneratingMutants: false, isPipelineRunning: false,
        })
      },

      setFileName: value => {
        abortAllRequests()
        set({
          fileName: normalizeFileName(value),
          compiled: null, analysis: null, mutants: [], report: null,
          error: null, progress: createInitialProgress(),
        })
      },

      setFramework: value => {
        abortAllRequests()
        set({
          framework: value,
          compiled: null, analysis: null, mutants: [], report: null,
          error: null, progress: createInitialProgress(),
        })
      },

      setOperators: value => {
        set({ operators: normalizeOperators(value), mutants: [], report: null, error: null })
      },

      setRetryOnNetworkError: value => set({ retryOnNetworkError: value }),

      clearError: () => set({ error: null, wsError: null }),
      clearReport: () => set({ report: null }),

      clearResults: () => {
        abortAllRequests()
        set({
          compiled: null, analysis: null, mutants: [], report: null,
          error: null, progress: createInitialProgress(),
          isCompiling: false, isAnalyzing: false,
          isGeneratingMutants: false, isPipelineRunning: false,
        })
      },

      // ── Mutant granulaire v2
      setMutantStatus: (id, status, patch = {}) => {
        set(state => ({
          mutants: state.mutants.map(m =>
            m.id === id ? { ...m, ...patch, id, status } : m
          ),
        }))
      },

      // ── Sélecteurs dérivés v2
      getSummary: () => {
        const { compiled, analysis, mutants, report } = get()
        return computeSummary(compiled, analysis, mutants, report)
      },

      getMutantsByStatus: (status) => get().mutants.filter(m => m.status === status),

      getFindingsBySeverity: (severity) =>
        (get().analysis?.findings ?? []).filter(f => f.severity === severity),

      // ── Historique v2
      saveToHistory: () => {
        const { fileName, framework, operators, sourceCode, compiled, analysis, mutants, report, progress, history } = get()
        const summary = computeSummary(compiled, analysis, mutants, report)
        const entry: AuditHistoryEntry = {
          id: generateId('audit'),
          fileName,
          framework,
          operators: [...operators],
          sourceCode,
          compiled,
          analysis,
          mutants: [...mutants],
          report,
          auditedAt: Date.now(),
          durationMs: progress.startedAt && progress.finishedAt
            ? progress.finishedAt - progress.startedAt
            : null,
          summary,
        }
        const next = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES)
        set({ history: next })
      },

      clearHistory: () => set({ history: [] }),

      removeHistoryEntry: (id) => {
        set(state => ({ history: state.history.filter(e => e.id !== id) }))
      },

      replayFromHistory: (id) => {
        const entry = get().history.find(e => e.id === id)
        if (!entry) return
        abortAllRequests()
        set({
          sourceCode: entry.sourceCode,
          fileName: entry.fileName,
          framework: entry.framework,
          operators: [...entry.operators],
          compiled: entry.compiled,
          analysis: entry.analysis,
          mutants: [...entry.mutants],
          report: entry.report,
          error: null,
          progress: createProgress('done', {
            current: 3, total: 3,
            message: `Audit rechargé depuis l'historique (${new Date(entry.auditedAt).toLocaleString()})`,
            finishedAt: entry.auditedAt,
          }),
        })
      },

      // ── Export / Import v2
      exportCurrentAudit: () => {
        const { fileName, framework, operators, sourceCode, compiled, analysis, mutants, report } = get()
        if (!compiled && !analysis && mutants.length === 0 && !report) return null
        const summary = computeSummary(compiled, analysis, mutants, report)
        return {
          version: '2' as const,
          exportedAt: Date.now(),
          fileName, framework,
          operators: [...operators],
          sourceCode, compiled, analysis,
          mutants: [...mutants],
          report, summary,
        }
      },

      importAudit: (data) => {
        if (!isRecord(data) || data.version !== '2') {
          set({ error: 'Format d\'import invalide. Vérifie que le fichier provient d\'EtherWorld Audit v2.' })
          return
        }
        abortAllRequests()
        set({
          fileName: typeof data.fileName === 'string' ? data.fileName : DEFAULT_FILE_NAME,
          framework: (data.framework as AuditFramework) ?? DEFAULT_FRAMEWORK,
          operators: Array.isArray(data.operators) ? data.operators as AuditOperator[] : [...DEFAULT_OPERATORS],
          sourceCode: typeof data.sourceCode === 'string' ? data.sourceCode : '',
          compiled: isRecord(data.compiled) ? data.compiled as CompilationResult : null,
          analysis: isRecord(data.analysis) ? data.analysis as AuditAnalysis : null,
          mutants: Array.isArray(data.mutants)
            ? (data.mutants as unknown[]).map((m, i) => normalizeMutant(m, i)).filter((m): m is AuditMutant => m !== null)
            : [],
          report: isRecord(data.report) ? data.report as AuditReport : null,
          error: null,
          progress: createProgress('done', {
            message: `Audit importé depuis le fichier (${new Date(Date.now()).toLocaleString()})`,
            finishedAt: Date.now(),
          }),
        })
      },

      // ── Compilation
      compile: async () => {
        const { sourceCode, fileName, framework, retryOnNetworkError } = get()
        validateAuditInput(sourceCode, fileName)
        const controller = createRequestController('compile')
        const startedAt = Date.now()

        set({
          error: null, compiled: null, isCompiling: true,
          progress: createProgress('compiling', {
            current: 0, total: 1,
            message: 'Compilation du contrat Solidity…', startedAt,
          }),
        })

        try {
          const payload = await postJson(
            '/api/audit/compile',
            { sourceCode, fileName: normalizeFileName(fileName), framework },
            controller.signal,
            retryOnNetworkError ? MAX_RETRY_ATTEMPTS : 0,
          )
          const compiled = extractCompilationResult(payload)
          if (isCurrentRequest('compile', controller)) {
            set({
              compiled, error: null,
              progress: createProgress('idle', {
                current: 1, total: 1,
                message: 'Compilation terminée.', startedAt, finishedAt: Date.now(),
              }),
            })
          }
          return compiled
        } catch (error) {
          if (isCurrentRequest('compile', controller)) {
            const aborted = isAbortError(error)
            set({
              error: aborted ? null : normalizeError(error, 'La compilation a échoué.'),
              progress: createProgress(aborted ? 'cancelled' : 'failed', {
                message: aborted ? 'Compilation annulée.' : 'Échec de la compilation.',
                startedAt, finishedAt: Date.now(),
              }),
            })
          }
          throw error
        } finally {
          if (isCurrentRequest('compile', controller)) set({ isCompiling: false })
          releaseRequestController('compile', controller)
        }
      },

      // ── Analyse statique
      analyze: async () => {
        const { sourceCode, fileName, framework, retryOnNetworkError } = get()
        validateAuditInput(sourceCode, fileName)
        const controller = createRequestController('analyze')
        const startedAt = Date.now()

        set({
          error: null, analysis: null, isAnalyzing: true,
          progress: createProgress('analyzing', {
            current: 0, total: 1,
            message: 'Analyse statique et détection des vulnérabilités…', startedAt,
          }),
        })

        try {
          const payload = await postJson(
            '/api/audit/analyze',
            { sourceCode, fileName: normalizeFileName(fileName), framework },
            controller.signal,
            retryOnNetworkError ? MAX_RETRY_ATTEMPTS : 0,
          )
          const analysis = extractAnalysis(payload)
          if (isCurrentRequest('analyze', controller)) {
            set({
              analysis, error: null,
              progress: createProgress('idle', {
                current: 1, total: 1,
                message: 'Analyse terminée.', startedAt, finishedAt: Date.now(),
              }),
            })
          }
          return analysis
        } catch (error) {
          if (isCurrentRequest('analyze', controller)) {
            const aborted = isAbortError(error)
            set({
              error: aborted ? null : normalizeError(error, 'L\'analyse du contrat a échoué.'),
              progress: createProgress(aborted ? 'cancelled' : 'failed', {
                message: aborted ? 'Analyse annulée.' : 'Échec de l\'analyse.',
                startedAt, finishedAt: Date.now(),
              }),
            })
          }
          throw error
        } finally {
          if (isCurrentRequest('analyze', controller)) set({ isAnalyzing: false })
          releaseRequestController('analyze', controller)
        }
      },

      // ── Génération des mutants
      generateMutants: async () => {
        const { sourceCode, fileName, framework, operators, retryOnNetworkError } = get()
        validateAuditInput(sourceCode, fileName)
        const normalizedOperators = normalizeOperators(operators)
        if (normalizedOperators.length === 0) throw new Error('Sélectionne au moins un opérateur de mutation.')

        const controller = createRequestController('mutate')
        const startedAt = Date.now()

        set({
          error: null, mutants: [], report: null, isGeneratingMutants: true,
          progress: createProgress('generating-mutants', {
            current: 0, total: normalizedOperators.length,
            message: 'Génération des mutations du contrat…', startedAt,
          }),
        })

        try {
          const payload = await postJson(
            '/api/audit/mutate',
            { sourceCode, fileName: normalizeFileName(fileName), framework, operators: normalizedOperators },
            controller.signal,
            retryOnNetworkError ? MAX_RETRY_ATTEMPTS : 0,
          )
          const mutants = extractMutants(payload)
          if (isCurrentRequest('mutate', controller)) {
            set({
              mutants, error: null,
              progress: createProgress('idle', {
                current: mutants.length, total: mutants.length,
                message: `${mutants.length} mutant(s) généré(s).`, startedAt, finishedAt: Date.now(),
              }),
            })
          }
          return mutants
        } catch (error) {
          if (isCurrentRequest('mutate', controller)) {
            const aborted = isAbortError(error)
            set({
              error: aborted ? null : normalizeError(error, 'La génération des mutants a échoué.'),
              progress: createProgress(aborted ? 'cancelled' : 'failed', {
                message: aborted ? 'Génération annulée.' : 'Échec de la génération des mutants.',
                startedAt, finishedAt: Date.now(),
              }),
            })
          }
          throw error
        } finally {
          if (isCurrentRequest('mutate', controller)) set({ isGeneratingMutants: false })
          releaseRequestController('mutate', controller)
        }
      },

      // ── Pipeline complet
      runFullAudit: async () => {
        const { sourceCode, fileName } = get()
        validateAuditInput(sourceCode, fileName)
        abortAllRequests()

        const startedAt = Date.now()
        set({
          error: null, compiled: null, analysis: null, mutants: [], report: null,
          isPipelineRunning: true,
          progress: createProgress('running', {
            current: 0, total: 3,
            message: 'Démarrage du pipeline complet d\'audit…', startedAt,
          }),
        })

        try {
          const compiled = await get().compile()
          set({ progress: createProgress('running', { current: 1, total: 3, message: 'Compilation terminée. Analyse en cours…', startedAt }) })

          const analysis = await get().analyze()
          set({ progress: createProgress('running', { current: 2, total: 3, message: 'Analyse terminée. Génération des mutants…', startedAt }) })

          const mutants = await get().generateMutants()

          const result: AuditPipelineResult = { compiled, analysis, mutants }

          set({
            error: null,
            progress: createProgress('done', {
              current: 3, total: 3,
              message: 'Pipeline d\'audit terminé avec succès.',
              startedAt, finishedAt: Date.now(),
            }),
          })

          // Auto-save en historique après pipeline réussi
          get().saveToHistory()

          return result
        } catch (error) {
          const aborted = isAbortError(error)
          set({
            error: aborted ? null : normalizeError(error, 'Le pipeline complet d\'audit a échoué.'),
            progress: createProgress(aborted ? 'cancelled' : 'failed', {
              message: aborted ? 'Pipeline annulé.' : 'Le pipeline d\'audit a échoué.',
              startedAt, finishedAt: Date.now(),
            }),
          })
          throw error
        } finally {
          set({ isPipelineRunning: false })
        }
      },

      // ── Annulation
      cancelActiveRequests: () => {
        abortAllRequests()
        set({
          error: null,
          isCompiling: false, isAnalyzing: false,
          isGeneratingMutants: false, isPipelineRunning: false,
          progress: createProgress('cancelled', {
            message: 'Les opérations actives ont été annulées.',
            finishedAt: Date.now(),
          }),
        })
      },

      // ── Événements WebSocket
      handleWsEvent: rawMessage => {
        const message = parseWsMessage(rawMessage)
        if (!message) {
          set({ wsError: 'Un message WebSocket invalide a été ignoré.' })
          return
        }

        const data = isRecord(message.data) ? message.data : {}

        switch (message.event) {
          case 'CONNECTED':
          case 'READY':
            set({ wsStatus: 'connected', wsError: null })
            return

          case 'JOB_STARTED': {
            const total = readNumber(data, 'total', 0)
            set({
              error: null, report: null,
              progress: createProgress('running', {
                current: 0, total,
                message: typeof data.message === 'string' ? data.message : 'Exécution des mutants…',
                startedAt: Date.now(),
              }),
            })
            return
          }

          case 'JOB_PROGRESS':
          case 'PROGRESS': {
            const current = readNumber(data, 'current', 0)
            const total = readNumber(data, 'total', 0)
            set(state => ({
              progress: createProgress('running', {
                current, total,
                message: typeof data.message === 'string' ? data.message : state.progress.message,
                startedAt: state.progress.startedAt ?? Date.now(),
              }),
            }))
            return
          }

          case 'MUTANT_STARTED': {
            const mutantId = typeof data.id === 'string' ? data.id
              : isRecord(data.mutant) && typeof data.mutant.id === 'string' ? data.mutant.id : null
            if (!mutantId) return
            set(state => ({
              mutants: state.mutants.map(m => m.id === mutantId ? { ...m, status: 'running' } : m),
            }))
            return
          }

          case 'MUTANT_DONE': {
            const index = readNumber(data, 'index', 0)
            const total = readNumber(data, 'total', get().progress.total)
            const receivedMutant = normalizeMutant(data.mutant, index)

            set(state => {
              let nextMutants = state.mutants
              if (receivedMutant) {
                const existingIndex = state.mutants.findIndex(m => m.id === receivedMutant.id)
                nextMutants = existingIndex >= 0
                  ? state.mutants.map(m => m.id === receivedMutant.id ? { ...m, ...receivedMutant } : m)
                  : [...state.mutants, receivedMutant]
              }
              return {
                mutants: nextMutants,
                progress: createProgress('running', {
                  current: Math.min(total || index + 1, index + 1), total,
                  message: typeof data.message === 'string' ? data.message : `Mutant ${index + 1}${total > 0 ? ` sur ${total}` : ''} terminé.`,
                  startedAt: state.progress.startedAt ?? Date.now(),
                }),
              }
            })
            return
          }

          case 'JOB_COMPLETED': {
            const report = extractReport(data.report ?? data)
            set(state => ({
              report, error: null,
              progress: createProgress('done', {
                current: state.progress.total || state.progress.current,
                total: state.progress.total || state.progress.current,
                message: typeof data.message === 'string' ? data.message : 'Audit terminé.',
                startedAt: state.progress.startedAt,
                finishedAt: Date.now(),
              }),
            }))
            // Auto-save en historique après complétion via WS
            setTimeout(() => get().saveToHistory(), 0)
            return
          }

          case 'JOB_CANCELLED':
            set(state => ({
              error: null,
              progress: createProgress('cancelled', {
                current: state.progress.current, total: state.progress.total,
                message: typeof data.message === 'string' ? data.message : 'Audit annulé.',
                startedAt: state.progress.startedAt, finishedAt: Date.now(),
              }),
            }))
            return

          case 'JOB_FAILED':
          case 'ERROR': {
            const errorMessage = normalizeError(
              data.error ?? data.message ?? message.data,
              'Le serveur d\'audit a signalé une erreur.',
            )
            set(state => ({
              error: errorMessage,
              progress: createProgress('failed', {
                current: state.progress.current, total: state.progress.total,
                message: errorMessage,
                startedAt: state.progress.startedAt, finishedAt: Date.now(),
              }),
            }))
            return
          }

          case 'PING':
          case 'HEARTBEAT':
            if (activeSocket?.readyState === WebSocket.OPEN) {
              activeSocket.send(JSON.stringify({ event: 'PONG', timestamp: Date.now() }))
            }
            return

          default:
            // Événements inconnus ignorés volontairement
        }
      },

      // ── Connexion WebSocket
      connectWebSocket: (url = DEFAULT_WS_PATH) => {
        if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
          set({ wsStatus: 'error', wsError: 'WebSocket est indisponible dans cet environnement.' })
          return
        }

        lastWebSocketUrl = url
        socketWasClosedManually = false
        clearReconnectTimer()

        if (activeSocket?.readyState === WebSocket.OPEN || activeSocket?.readyState === WebSocket.CONNECTING) return

        const resolvedUrl = resolveWebSocketUrl(url)
        set({ wsStatus: reconnectAttempts > 0 ? 'reconnecting' : 'connecting', wsError: null })

        try {
          const socket = new WebSocket(resolvedUrl)
          activeSocket = socket

          socket.onopen = () => {
            if (activeSocket !== socket) return
            reconnectAttempts = 0
            clearReconnectTimer()
            set({ wsStatus: 'connected', wsError: null })
            socket.send(JSON.stringify({ event: 'CLIENT_READY', timestamp: Date.now() }))
          }

          socket.onmessage = event => {
            if (activeSocket !== socket) return
            get().handleWsEvent(event.data)
          }

          socket.onerror = () => {
            if (activeSocket !== socket) return
            set({ wsStatus: 'error', wsError: 'Une erreur est survenue sur la connexion WebSocket.' })
          }

          socket.onclose = event => {
            if (activeSocket === socket) activeSocket = null
            if (socketWasClosedManually) {
              reconnectAttempts = 0
              set({ wsStatus: 'disconnected', wsError: null })
              return
            }
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              set({ wsStatus: 'error', wsError: 'La reconnexion WebSocket a échoué après plusieurs tentatives.' })
              return
            }
            reconnectAttempts += 1
            const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (reconnectAttempts - 1), MAX_RECONNECT_DELAY_MS)
            set({
              wsStatus: 'reconnecting',
              wsError: event.reason || `Connexion interrompue. Nouvelle tentative dans ${Math.ceil(delay / 1_000)} seconde(s).`,
            })
            clearReconnectTimer()
            reconnectTimer = setTimeout(() => get().connectWebSocket(lastWebSocketUrl), delay)
          }
        } catch (error) {
          set({ wsStatus: 'error', wsError: normalizeError(error, 'Impossible de créer la connexion WebSocket.') })
        }
      },

      disconnectWebSocket: () => {
        socketWasClosedManually = true
        reconnectAttempts = 0
        clearReconnectTimer()
        if (activeSocket) {
          activeSocket.onopen = null
          activeSocket.onmessage = null
          activeSocket.onerror = null
          activeSocket.onclose = null
          activeSocket.close(1000, 'Déconnexion demandée par le client.')
          activeSocket = null
        }
        set({ wsStatus: 'disconnected', wsError: null })
      },

      // ── Reset
      resetAudit: () => {
        abortAllRequests()
        get().disconnectWebSocket()
        set({
          sourceCode: '', fileName: DEFAULT_FILE_NAME,
          framework: DEFAULT_FRAMEWORK, operators: [...DEFAULT_OPERATORS],
          retryOnNetworkError: true,
          compiled: null, analysis: null, mutants: [], report: null,
          progress: createInitialProgress(),
          error: null, wsError: null, wsStatus: 'disconnected',
          isCompiling: false, isAnalyzing: false,
          isGeneratingMutants: false, isPipelineRunning: false,
          // history conservé volontairement au reset
        })
      },
    }),
    {
      name: 'etherworld-audit-store',
      storage: createJSONStorage(() => localStorage),
      // On persiste uniquement les données utiles entre sessions
      partialize: (state) => ({
        history: state.history,
        framework: state.framework,
        operators: state.operators,
        retryOnNetworkError: state.retryOnNetworkError,
        // sourceCode non persisté (trop lourd + risque de confusion)
      }),
    }
  )
)

export default useAuditStore