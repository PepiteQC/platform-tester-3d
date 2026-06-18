// ============================================================================
//  EtherWorld — Audit Store
//  Chemin : stores/auditStore.ts
//
//  Responsabilités :
//  - Gestion du code Solidity à auditer
//  - Compilation
//  - Analyse statique
//  - Génération des mutants
//  - Pipeline d’audit complet
//  - Progression des tâches
//  - Connexion WebSocket avec reconnexion automatique
//  - Annulation des requêtes précédentes
//  - Protection contre les réponses obsolètes
//  - Normalisation robuste des erreurs HTTP et WebSocket
// ============================================================================

import { create } from 'zustand'

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

type RequestKind = 'compile' | 'analyze' | 'mutate'

// ============================================================================
// Interface complète du store
// ============================================================================

export interface AuditStore {
  sourceCode: string
  fileName: string
  framework: AuditFramework
  operators: AuditOperator[]

  compiled: CompilationResult | null
  analysis: AuditAnalysis | null
  mutants: AuditMutant[]
  report: AuditReport | null

  progress: AuditProgress

  error: string | null
  wsError: string | null
  wsStatus: AuditWsStatus

  isCompiling: boolean
  isAnalyzing: boolean
  isGeneratingMutants: boolean
  isPipelineRunning: boolean

  setSourceCode: (value: string) => void
  setFileName: (value: string) => void
  setFramework: (value: AuditFramework) => void
  setOperators: (value: AuditOperator[]) => void

  clearError: () => void
  clearReport: () => void
  clearResults: () => void

  compile: () => Promise<CompilationResult>
  analyze: () => Promise<AuditAnalysis>
  generateMutants: () => Promise<AuditMutant[]>
  runFullAudit: () => Promise<AuditPipelineResult>

  cancelActiveRequests: () => void

  connectWebSocket: (url?: string) => void
  disconnectWebSocket: () => void
  handleWsEvent: (message: unknown) => void

  resetAudit: () => void
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_FILE_NAME = 'MyContract.sol'
const DEFAULT_FRAMEWORK: AuditFramework = 'foundry'
const DEFAULT_OPERATORS: AuditOperator[] = ['BCR', 'AOR', 'BLR']

const DEFAULT_WS_PATH = '/api/audit/ws'

const MAX_RECONNECT_ATTEMPTS = 10
const BASE_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 30_000

// ============================================================================
// État technique externe au store
//
// Ces objets ne doivent pas être placés dans Zustand :
// - AbortController
// - WebSocket
// - Timers
//
// Ils ne sont pas sérialisables et n’appartiennent pas à l’état d’interface.
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
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === 'AbortError'
  )
}

function normalizeError(
  error: unknown,
  fallback = 'Une erreur inconnue est survenue.',
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (isRecord(error)) {
    const possibleMessage =
      error.message ??
      error.error ??
      error.detail ??
      error.reason

    if (
      typeof possibleMessage === 'string' &&
      possibleMessage.trim()
    ) {
      return possibleMessage
    }
  }

  return fallback
}

function normalizeFileName(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    return DEFAULT_FILE_NAME
  }

  return trimmed.endsWith('.sol')
    ? trimmed
    : `${trimmed}.sol`
}

function normalizeOperators(
  operators: readonly AuditOperator[],
): AuditOperator[] {
  const normalized = operators
    .map(operator => String(operator).trim())
    .filter(Boolean)

  return [...new Set(normalized)] as AuditOperator[]
}

function validateAuditInput(
  sourceCode: string,
  fileName: string,
): void {
  if (!sourceCode.trim()) {
    throw new Error(
      'Le code source Solidity est vide. Ajoute un contrat avant de lancer l’audit.',
    )
  }

  if (!fileName.trim()) {
    throw new Error(
      'Le nom du fichier Solidity est obligatoire.',
    )
  }
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

  const percent =
    total > 0
      ? Math.min(100, Math.round((current / total) * 100))
      : phase === 'done'
        ? 100
        : 0

  return {
    phase,
    current,
    total,
    percent,
    message: options.message ?? null,
    startedAt: options.startedAt ?? null,
    finishedAt: options.finishedAt ?? null,
  }
}

function createInitialProgress(): AuditProgress {
  return createProgress('idle')
}

function createRequestController(
  kind: RequestKind,
): AbortController {
  requestControllers.get(kind)?.abort()

  const controller = new AbortController()

  requestControllers.set(kind, controller)

  return controller
}

function isCurrentRequest(
  kind: RequestKind,
  controller: AbortController,
): boolean {
  return requestControllers.get(kind) === controller
}

function releaseRequestController(
  kind: RequestKind,
  controller: AbortController,
): void {
  if (isCurrentRequest(kind, controller)) {
    requestControllers.delete(kind)
  }
}

function abortAllRequests(): void {
  requestControllers.forEach(controller => {
    controller.abort()
  })

  requestControllers.clear()
}

// ============================================================================
// Client HTTP robuste
// ============================================================================

async function readResponseBody(
  response: Response,
): Promise<unknown> {
  const text = await response.text()

  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function extractApiError(
  payload: unknown,
  fallback: string,
): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (isRecord(payload)) {
    const possibleMessage =
      payload.error ??
      payload.message ??
      payload.detail ??
      payload.reason

    if (
      typeof possibleMessage === 'string' &&
      possibleMessage.trim()
    ) {
      return possibleMessage
    }
  }

  return fallback
}

async function postJson(
  url: string,
  body: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify(body),
    signal,
  })

  const payload = await readResponseBody(response)

  if (!response.ok) {
    throw new Error(
      extractApiError(
        payload,
        `La requête ${url} a échoué avec le statut HTTP ${response.status}.`,
      ),
    )
  }

  return payload
}

// ============================================================================
// Extraction et normalisation des réponses API
// ============================================================================

function extractCompilationResult(
  payload: unknown,
): CompilationResult {
  if (!isRecord(payload)) {
    throw new Error(
      'La réponse de compilation possède un format invalide.',
    )
  }

  const candidate = isRecord(payload.compiled)
    ? payload.compiled
    : payload

  return candidate as CompilationResult
}

function normalizeFinding(
  value: unknown,
): AuditFinding | null {
  if (!isRecord(value)) {
    return null
  }

  return value as AuditFinding
}

function extractAnalysis(
  payload: unknown,
): AuditAnalysis {
  if (!isRecord(payload)) {
    throw new Error(
      'La réponse d’analyse possède un format invalide.',
    )
  }

  const candidate = isRecord(payload.analysis)
    ? payload.analysis
    : payload

  const findings = Array.isArray(candidate.findings)
    ? candidate.findings
        .map(normalizeFinding)
        .filter(
          (finding): finding is AuditFinding =>
            finding !== null,
        )
    : undefined

  return {
    ...candidate,
    ...(findings ? { findings } : {}),
  } as AuditAnalysis
}

function normalizeMutant(
  value: unknown,
  fallbackIndex = 0,
): AuditMutant | null {
  if (!isRecord(value)) {
    return null
  }

  const id =
    typeof value.id === 'string' && value.id.trim()
      ? value.id
      : `mutant_${fallbackIndex}_${Date.now()}`

  const operator =
    typeof value.operator === 'string' &&
    value.operator.trim()
      ? value.operator
      : 'UNKNOWN'

  const status =
    typeof value.status === 'string' &&
    value.status.trim()
      ? value.status
      : 'pending'

  return {
    ...value,
    id,
    operator,
    status,
  } as AuditMutant
}

function extractMutants(
  payload: unknown,
): AuditMutant[] {
  const rawMutants = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.mutants)
      ? payload.mutants
      : null

  if (!rawMutants) {
    throw new Error(
      'La réponse de mutation ne contient aucun tableau "mutants".',
    )
  }

  return rawMutants
    .map((mutant, index) =>
      normalizeMutant(mutant, index),
    )
    .filter(
      (mutant): mutant is AuditMutant =>
        mutant !== null,
    )
}

function extractReport(
  payload: unknown,
): AuditReport | null {
  if (!isRecord(payload)) {
    return null
  }

  const candidate = isRecord(payload.report)
    ? payload.report
    : payload

  return candidate as AuditReport
}

// ============================================================================
// WebSocket
// ============================================================================

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function resolveWebSocketUrl(pathOrUrl: string): string {
  if (/^wss?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl
  }

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl.replace(/^http/i, 'ws')
  }

  if (typeof window === 'undefined') {
    return pathOrUrl
  }

  const resolved = new URL(pathOrUrl, window.location.href)

  resolved.protocol =
    resolved.protocol === 'https:' ? 'wss:' : 'ws:'

  return resolved.toString()
}

function parseWsMessage(
  message: unknown,
): AuditWsMessage | null {
  let parsed = message

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      return null
    }
  }

  if (!isRecord(parsed)) {
    return null
  }

  if (
    typeof parsed.event !== 'string' ||
    !parsed.event.trim()
  ) {
    return null
  }

  return {
    event: parsed.event,
    data: parsed.data,
  }
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = record[key]

  return typeof value === 'number' &&
    Number.isFinite(value)
    ? value
    : fallback
}

// ============================================================================
// Store Zustand
// ============================================================================

export const useAuditStore = create<AuditStore>()(
  (set, get) => ({
    sourceCode: '',
    fileName: DEFAULT_FILE_NAME,
    framework: DEFAULT_FRAMEWORK,
    operators: [...DEFAULT_OPERATORS],

    compiled: null,
    analysis: null,
    mutants: [],
    report: null,

    progress: createInitialProgress(),

    error: null,
    wsError: null,
    wsStatus: 'disconnected',

    isCompiling: false,
    isAnalyzing: false,
    isGeneratingMutants: false,
    isPipelineRunning: false,

    // ========================================================================
    // Édition des paramètres
    // ========================================================================

    setSourceCode: value => {
      abortAllRequests()

      set({
        sourceCode: value,
        compiled: null,
        analysis: null,
        mutants: [],
        report: null,
        error: null,
        progress: createInitialProgress(),
        isCompiling: false,
        isAnalyzing: false,
        isGeneratingMutants: false,
        isPipelineRunning: false,
      })
    },

    setFileName: value => {
      abortAllRequests()

      set({
        fileName: normalizeFileName(value),
        compiled: null,
        analysis: null,
        mutants: [],
        report: null,
        error: null,
        progress: createInitialProgress(),
      })
    },

    setFramework: value => {
      abortAllRequests()

      set({
        framework: value,
        compiled: null,
        analysis: null,
        mutants: [],
        report: null,
        error: null,
        progress: createInitialProgress(),
      })
    },

    setOperators: value => {
      const operators = normalizeOperators(value)

      set({
        operators,
        mutants: [],
        report: null,
        error: null,
      })
    },

    clearError: () => {
      set({
        error: null,
        wsError: null,
      })
    },

    clearReport: () => {
      set({
        report: null,
      })
    },

    clearResults: () => {
      abortAllRequests()

      set({
        compiled: null,
        analysis: null,
        mutants: [],
        report: null,
        error: null,
        progress: createInitialProgress(),
        isCompiling: false,
        isAnalyzing: false,
        isGeneratingMutants: false,
        isPipelineRunning: false,
      })
    },

    // ========================================================================
    // Compilation
    // ========================================================================

    compile: async () => {
      const {
        sourceCode,
        fileName,
        framework,
      } = get()

      validateAuditInput(sourceCode, fileName)

      const controller =
        createRequestController('compile')

      const startedAt = Date.now()

      set({
        error: null,
        compiled: null,
        isCompiling: true,
        progress: createProgress('compiling', {
          current: 0,
          total: 1,
          message: 'Compilation du contrat Solidity…',
          startedAt,
        }),
      })

      try {
        const payload = await postJson(
          '/api/audit/compile',
          {
            sourceCode,
            fileName: normalizeFileName(fileName),
            framework,
          },
          controller.signal,
        )

        const compiled =
          extractCompilationResult(payload)

        if (
          isCurrentRequest('compile', controller)
        ) {
          set({
            compiled,
            error: null,
            progress: createProgress('idle', {
              current: 1,
              total: 1,
              message: 'Compilation terminée.',
              startedAt,
              finishedAt: Date.now(),
            }),
          })
        }

        return compiled
      } catch (error) {
        if (
          isCurrentRequest('compile', controller)
        ) {
          const aborted = isAbortError(error)

          set({
            error: aborted
              ? null
              : normalizeError(
                  error,
                  'La compilation a échoué.',
                ),

            progress: createProgress(
              aborted ? 'cancelled' : 'failed',
              {
                message: aborted
                  ? 'Compilation annulée.'
                  : 'Échec de la compilation.',
                startedAt,
                finishedAt: Date.now(),
              },
            ),
          })
        }

        throw error
      } finally {
        if (
          isCurrentRequest('compile', controller)
        ) {
          set({
            isCompiling: false,
          })
        }

        releaseRequestController(
          'compile',
          controller,
        )
      }
    },

    // ========================================================================
    // Analyse statique
    // ========================================================================

    analyze: async () => {
      const {
        sourceCode,
        fileName,
        framework,
      } = get()

      validateAuditInput(sourceCode, fileName)

      const controller =
        createRequestController('analyze')

      const startedAt = Date.now()

      set({
        error: null,
        analysis: null,
        isAnalyzing: true,
        progress: createProgress('analyzing', {
          current: 0,
          total: 1,
          message:
            'Analyse statique et détection des vulnérabilités…',
          startedAt,
        }),
      })

      try {
        const payload = await postJson(
          '/api/audit/analyze',
          {
            sourceCode,
            fileName: normalizeFileName(fileName),
            framework,
          },
          controller.signal,
        )

        const analysis =
          extractAnalysis(payload)

        if (
          isCurrentRequest('analyze', controller)
        ) {
          set({
            analysis,
            error: null,
            progress: createProgress('idle', {
              current: 1,
              total: 1,
              message: 'Analyse terminée.',
              startedAt,
              finishedAt: Date.now(),
            }),
          })
        }

        return analysis
      } catch (error) {
        if (
          isCurrentRequest('analyze', controller)
        ) {
          const aborted = isAbortError(error)

          set({
            error: aborted
              ? null
              : normalizeError(
                  error,
                  'L’analyse du contrat a échoué.',
                ),

            progress: createProgress(
              aborted ? 'cancelled' : 'failed',
              {
                message: aborted
                  ? 'Analyse annulée.'
                  : 'Échec de l’analyse.',
                startedAt,
                finishedAt: Date.now(),
              },
            ),
          })
        }

        throw error
      } finally {
        if (
          isCurrentRequest('analyze', controller)
        ) {
          set({
            isAnalyzing: false,
          })
        }

        releaseRequestController(
          'analyze',
          controller,
        )
      }
    },

    // ========================================================================
    // Génération des mutants
    // ========================================================================

    generateMutants: async () => {
      const {
        sourceCode,
        fileName,
        framework,
        operators,
      } = get()

      validateAuditInput(sourceCode, fileName)

      const normalizedOperators =
        normalizeOperators(operators)

      if (normalizedOperators.length === 0) {
        throw new Error(
          'Sélectionne au moins un opérateur de mutation.',
        )
      }

      const controller =
        createRequestController('mutate')

      const startedAt = Date.now()

      set({
        error: null,
        mutants: [],
        report: null,
        isGeneratingMutants: true,
        progress: createProgress(
          'generating-mutants',
          {
            current: 0,
            total: normalizedOperators.length,
            message:
              'Génération des mutations du contrat…',
            startedAt,
          },
        ),
      })

      try {
        const payload = await postJson(
          '/api/audit/mutate',
          {
            sourceCode,
            fileName: normalizeFileName(fileName),
            framework,
            operators: normalizedOperators,
          },
          controller.signal,
        )

        const mutants =
          extractMutants(payload)

        if (
          isCurrentRequest('mutate', controller)
        ) {
          set({
            mutants,
            error: null,
            progress: createProgress('idle', {
              current: mutants.length,
              total: mutants.length,
              message: `${mutants.length} mutant(s) généré(s).`,
              startedAt,
              finishedAt: Date.now(),
            }),
          })
        }

        return mutants
      } catch (error) {
        if (
          isCurrentRequest('mutate', controller)
        ) {
          const aborted = isAbortError(error)

          set({
            error: aborted
              ? null
              : normalizeError(
                  error,
                  'La génération des mutants a échoué.',
                ),

            progress: createProgress(
              aborted ? 'cancelled' : 'failed',
              {
                message: aborted
                  ? 'Génération annulée.'
                  : 'Échec de la génération des mutants.',
                startedAt,
                finishedAt: Date.now(),
              },
            ),
          })
        }

        throw error
      } finally {
        if (
          isCurrentRequest('mutate', controller)
        ) {
          set({
            isGeneratingMutants: false,
          })
        }

        releaseRequestController(
          'mutate',
          controller,
        )
      }
    },

    // ========================================================================
    // Pipeline complet
    // ========================================================================

    runFullAudit: async () => {
      const {
        sourceCode,
        fileName,
      } = get()

      validateAuditInput(sourceCode, fileName)

      abortAllRequests()

      const startedAt = Date.now()

      set({
        error: null,
        compiled: null,
        analysis: null,
        mutants: [],
        report: null,
        isPipelineRunning: true,
        progress: createProgress('running', {
          current: 0,
          total: 3,
          message:
            'Démarrage du pipeline complet d’audit…',
          startedAt,
        }),
      })

      try {
        const compiled =
          await get().compile()

        set({
          progress: createProgress('running', {
            current: 1,
            total: 3,
            message:
              'Compilation terminée. Analyse en cours…',
            startedAt,
          }),
        })

        const analysis =
          await get().analyze()

        set({
          progress: createProgress('running', {
            current: 2,
            total: 3,
            message:
              'Analyse terminée. Génération des mutants…',
            startedAt,
          }),
        })

        const mutants =
          await get().generateMutants()

        const result: AuditPipelineResult = {
          compiled,
          analysis,
          mutants,
        }

        set({
          error: null,
          progress: createProgress('done', {
            current: 3,
            total: 3,
            message:
              'Pipeline d’audit terminé avec succès.',
            startedAt,
            finishedAt: Date.now(),
          }),
        })

        return result
      } catch (error) {
        const aborted = isAbortError(error)

        set({
          error: aborted
            ? null
            : normalizeError(
                error,
                'Le pipeline complet d’audit a échoué.',
              ),

          progress: createProgress(
            aborted ? 'cancelled' : 'failed',
            {
              message: aborted
                ? 'Pipeline annulé.'
                : 'Le pipeline d’audit a échoué.',
              startedAt,
              finishedAt: Date.now(),
            },
          ),
        })

        throw error
      } finally {
        set({
          isPipelineRunning: false,
        })
      }
    },

    // ========================================================================
    // Annulation
    // ========================================================================

    cancelActiveRequests: () => {
      abortAllRequests()

      set({
        error: null,
        isCompiling: false,
        isAnalyzing: false,
        isGeneratingMutants: false,
        isPipelineRunning: false,
        progress: createProgress('cancelled', {
          message:
            'Les opérations actives ont été annulées.',
          finishedAt: Date.now(),
        }),
      })
    },

    // ========================================================================
    // Événements WebSocket
    // ========================================================================

    handleWsEvent: rawMessage => {
      const message =
        parseWsMessage(rawMessage)

      if (!message) {
        set({
          wsError:
            'Un message WebSocket invalide a été ignoré.',
        })

        return
      }

      const data = isRecord(message.data)
        ? message.data
        : {}

      switch (message.event) {
        case 'CONNECTED':
        case 'READY': {
          set({
            wsStatus: 'connected',
            wsError: null,
          })

          return
        }

        case 'JOB_STARTED': {
          const total = readNumber(
            data,
            'total',
            0,
          )

          set({
            error: null,
            report: null,
            progress: createProgress('running', {
              current: 0,
              total,
              message:
                typeof data.message === 'string'
                  ? data.message
                  : 'Exécution des mutants…',
              startedAt: Date.now(),
            }),
          })

          return
        }

        case 'JOB_PROGRESS':
        case 'PROGRESS': {
          const current = readNumber(
            data,
            'current',
            0,
          )

          const total = readNumber(
            data,
            'total',
            0,
          )

          set(state => ({
            progress: createProgress('running', {
              current,
              total,
              message:
                typeof data.message === 'string'
                  ? data.message
                  : state.progress.message,
              startedAt:
                state.progress.startedAt ??
                Date.now(),
            }),
          }))

          return
        }

        case 'MUTANT_STARTED': {
          const mutantId =
            typeof data.id === 'string'
              ? data.id
              : isRecord(data.mutant) &&
                  typeof data.mutant.id === 'string'
                ? data.mutant.id
                : null

          if (!mutantId) {
            return
          }

          set(state => ({
            mutants: state.mutants.map(mutant =>
              mutant.id === mutantId
                ? {
                    ...mutant,
                    status: 'running',
                  }
                : mutant,
            ),
          }))

          return
        }

        case 'MUTANT_DONE': {
          const index = readNumber(
            data,
            'index',
            0,
          )

          const total = readNumber(
            data,
            'total',
            get().progress.total,
          )

          const receivedMutant =
            normalizeMutant(
              data.mutant,
              index,
            )

          set(state => {
            let nextMutants = state.mutants

            if (receivedMutant) {
              const existingIndex =
                state.mutants.findIndex(
                  mutant =>
                    mutant.id ===
                    receivedMutant.id,
                )

              if (existingIndex >= 0) {
                nextMutants =
                  state.mutants.map(mutant =>
                    mutant.id ===
                    receivedMutant.id
                      ? {
                          ...mutant,
                          ...receivedMutant,
                        }
                      : mutant,
                  )
              } else {
                nextMutants = [
                  ...state.mutants,
                  receivedMutant,
                ]
              }
            }

            return {
              mutants: nextMutants,

              progress: createProgress('running', {
                current: Math.min(
                  total || index + 1,
                  index + 1,
                ),
                total,
                message:
                  typeof data.message === 'string'
                    ? data.message
                    : `Mutant ${index + 1}${
                        total > 0
                          ? ` sur ${total}`
                          : ''
                      } terminé.`,
                startedAt:
                  state.progress.startedAt ??
                  Date.now(),
              }),
            }
          })

          return
        }

        case 'JOB_COMPLETED': {
          const report =
            extractReport(
              data.report ?? data,
            )

          set(state => ({
            report,
            error: null,

            progress: createProgress('done', {
              current:
                state.progress.total ||
                state.progress.current,

              total:
                state.progress.total ||
                state.progress.current,

              message:
                typeof data.message === 'string'
                  ? data.message
                  : 'Audit terminé.',

              startedAt:
                state.progress.startedAt,

              finishedAt: Date.now(),
            }),
          }))

          return
        }

        case 'JOB_CANCELLED': {
          set(state => ({
            error: null,

            progress: createProgress(
              'cancelled',
              {
                current:
                  state.progress.current,

                total:
                  state.progress.total,

                message:
                  typeof data.message ===
                  'string'
                    ? data.message
                    : 'Audit annulé.',

                startedAt:
                  state.progress.startedAt,

                finishedAt: Date.now(),
              },
            ),
          }))

          return
        }

        case 'JOB_FAILED':
        case 'ERROR': {
          const errorMessage =
            normalizeError(
              data.error ??
                data.message ??
                message.data,
              'Le serveur d’audit a signalé une erreur.',
            )

          set(state => ({
            error: errorMessage,

            progress: createProgress('failed', {
              current:
                state.progress.current,

              total:
                state.progress.total,

              message: errorMessage,

              startedAt:
                state.progress.startedAt,

              finishedAt: Date.now(),
            }),
          }))

          return
        }

        case 'PING':
        case 'HEARTBEAT': {
          if (
            activeSocket?.readyState ===
            WebSocket.OPEN
          ) {
            activeSocket.send(
              JSON.stringify({
                event: 'PONG',
                timestamp: Date.now(),
              }),
            )
          }

          return
        }

        default: {
          // Les événements inconnus sont volontairement ignorés.
          // Cela permet au serveur d’évoluer sans casser le client.
        }
      }
    },

    // ========================================================================
    // Connexion WebSocket
    // ========================================================================

    connectWebSocket: (
      url = DEFAULT_WS_PATH,
    ) => {
      if (
        typeof window === 'undefined' ||
        typeof WebSocket === 'undefined'
      ) {
        set({
          wsStatus: 'error',
          wsError:
            'WebSocket est indisponible dans cet environnement.',
        })

        return
      }

      lastWebSocketUrl = url
      socketWasClosedManually = false

      clearReconnectTimer()

      if (
        activeSocket?.readyState ===
          WebSocket.OPEN ||
        activeSocket?.readyState ===
          WebSocket.CONNECTING
      ) {
        return
      }

      const resolvedUrl =
        resolveWebSocketUrl(url)

      set({
        wsStatus:
          reconnectAttempts > 0
            ? 'reconnecting'
            : 'connecting',
        wsError: null,
      })

      try {
        const socket =
          new WebSocket(resolvedUrl)

        activeSocket = socket

        socket.onopen = () => {
          if (activeSocket !== socket) {
            return
          }

          reconnectAttempts = 0
          clearReconnectTimer()

          set({
            wsStatus: 'connected',
            wsError: null,
          })

          socket.send(
            JSON.stringify({
              event: 'CLIENT_READY',
              timestamp: Date.now(),
            }),
          )
        }

        socket.onmessage = event => {
          if (activeSocket !== socket) {
            return
          }

          get().handleWsEvent(event.data)
        }

        socket.onerror = () => {
          if (activeSocket !== socket) {
            return
          }

          set({
            wsStatus: 'error',
            wsError:
              'Une erreur est survenue sur la connexion WebSocket.',
          })
        }

        socket.onclose = event => {
          if (activeSocket === socket) {
            activeSocket = null
          }

          if (socketWasClosedManually) {
            reconnectAttempts = 0

            set({
              wsStatus: 'disconnected',
              wsError: null,
            })

            return
          }

          if (
            reconnectAttempts >=
            MAX_RECONNECT_ATTEMPTS
          ) {
            set({
              wsStatus: 'error',
              wsError:
                'La reconnexion WebSocket a échoué après plusieurs tentatives.',
            })

            return
          }

          reconnectAttempts += 1

          const exponentialDelay =
            BASE_RECONNECT_DELAY_MS *
            2 ** (reconnectAttempts - 1)

          const delay = Math.min(
            exponentialDelay,
            MAX_RECONNECT_DELAY_MS,
          )

          set({
            wsStatus: 'reconnecting',
            wsError:
              event.reason ||
              `Connexion interrompue. Nouvelle tentative dans ${Math.ceil(
                delay / 1_000,
              )} seconde(s).`,
          })

          clearReconnectTimer()

          reconnectTimer = setTimeout(() => {
            get().connectWebSocket(
              lastWebSocketUrl,
            )
          }, delay)
        }
      } catch (error) {
        set({
          wsStatus: 'error',
          wsError: normalizeError(
            error,
            'Impossible de créer la connexion WebSocket.',
          ),
        })
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

        activeSocket.close(
          1000,
          'Déconnexion demandée par le client.',
        )

        activeSocket = null
      }

      set({
        wsStatus: 'disconnected',
        wsError: null,
      })
    },

    // ========================================================================
    // Réinitialisation
    // ========================================================================

    resetAudit: () => {
      abortAllRequests()
      get().disconnectWebSocket()

      set({
        sourceCode: '',
        fileName: DEFAULT_FILE_NAME,
        framework: DEFAULT_FRAMEWORK,
        operators: [...DEFAULT_OPERATORS],

        compiled: null,
        analysis: null,
        mutants: [],
        report: null,

        progress: createInitialProgress(),

        error: null,
        wsError: null,
        wsStatus: 'disconnected',

        isCompiling: false,
        isAnalyzing: false,
        isGeneratingMutants: false,
        isPipelineRunning: false,
      })
    },
  }),
)

export default useAuditStore