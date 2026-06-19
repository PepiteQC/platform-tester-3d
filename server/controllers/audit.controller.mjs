import { v4 as uuidv4 } from 'uuid'
import { analyzeAST } from '../services/ast-analyzer.mjs'
import { CompilerError, compileSolidity } from '../services/compiler.mjs'
import { generateMutants } from '../services/mutator.mjs'
import { runMutationTests } from '../services/runner.mjs'
import { JobStore } from '../store/JobStore.mjs'
import { logger } from '../utils/logger.mjs'

// éventuellement injecté depuis ton serveur WS
import { publishJobEvent } from '../ws/publisher.mjs'

const DEFAULT_MAX_MUTANTS = 25
const HARD_MAX_MUTANTS = 200

function ok(res, status, data) {
  return res.status(status).json({
    success: true,
    data,
  })
}

function fail(res, status, error, details = undefined) {
  return res.status(status).json({
    success: false,
    error,
    ...(details !== undefined ? { details } : {}),
  })
}

function normalizeMaxMutants(value) {
  const n = Number(value ?? DEFAULT_MAX_MUTANTS)

  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_MAX_MUTANTS
  }

  return Math.min(Math.floor(n), HARD_MAX_MUTANTS)
}

// ─── handleCompile ──────────────────────────────────────────────────────────
export async function handleCompile(req, res) {
  const { sourceCode, fileName, compilerVersion } = req.validatedBody

  try {
    const result = await compileSolidity(sourceCode, fileName, compilerVersion)

    return ok(res, 200, result)
  } catch (err) {
    if (err instanceof CompilerError) {
      return fail(res, 422, err.message, err.details)
    }

    logger.error('Erreur inattendue compilation', {
      fileName,
      error: err.message,
    })

    throw err
  }
}

// ─── handleAnalyze ──────────────────────────────────────────────────────────
export async function handleAnalyze(req, res) {
  const { sourceCode } = req.validatedBody

  try {
    const analysis = analyzeAST(sourceCode)
    return ok(res, 200, analysis)
  } catch (err) {
    logger.warn('Erreur analyse AST', {
      error: err.message,
    })

    return fail(res, 422, 'Analyse AST impossible.', {
      message: err.message,
    })
  }
}

// ─── handleMutate ───────────────────────────────────────────────────────────
export async function handleMutate(req, res) {
  const {
    sourceCode,
    operators = [],
    maxMutants,
  } = req.validatedBody

  try {
    const safeMaxMutants = normalizeMaxMutants(maxMutants)
    const mutants = generateMutants(sourceCode, operators, safeMaxMutants)

    return ok(res, 200, {
      count: mutants.length,
      operators,
      maxMutants: safeMaxMutants,
      mutants: mutants.map(m => ({
        id: m.id,
        operator: m.operator,
        description: m.description,
        location: m.location,
        original: m.original,
        mutated: m.mutated,
        status: m.status,
      })),
    })
  } catch (err) {
    logger.warn('Erreur génération mutants', {
      error: err.message,
      operators,
    })

    return fail(res, 422, 'Génération des mutants impossible.', {
      message: err.message,
    })
  }
}

// ─── handleRunMutation ──────────────────────────────────────────────────────
export async function handleRunMutation(req, res) {
  const {
    sourceCode,
    fileName,
    operators = [],
    testCode,
    framework,
    maxMutants,
  } = req.validatedBody

  if (!testCode) {
    return fail(
      res,
      400,
      'Le champ testCode est requis pour exécuter les tests de mutation.'
    )
  }

  const safeMaxMutants = normalizeMaxMutants(maxMutants)
  const jobId = uuidv4()

  let mutants

  try {
    mutants = generateMutants(sourceCode, operators, safeMaxMutants)
  } catch (err) {
    return fail(res, 422, 'Génération des mutants impossible.', {
      message: err.message,
    })
  }

  if (mutants.length === 0) {
    return fail(
      res,
      422,
      'Aucun mutant généré. Vérifiez vos opérateurs et votre code source.'
    )
  }

  const startedAt = new Date().toISOString()

  JobStore.register(jobId, {
    jobId,
    status: 'running',
    startedAt,
    finishedAt: null,
    fileName,
    framework,
    operators,
    mutants: mutants.length,
    progress: {
      total: mutants.length,
      processed: 0,
      killed: 0,
      survived: 0,
    },
    report: null,
    error: null,
  })

  logger.info('Job de mutation démarré', {
    jobId,
    fileName,
    mutants: mutants.length,
    operators,
    framework,
  })

  publishJobEvent(jobId, {
    type: 'job_started',
    jobId,
    status: 'running',
    startedAt,
    mutants: mutants.length,
    framework,
    fileName,
  })

  ok(res, 202, {
    jobId,
    message: 'Job de mutation démarré. Suivez la progression via WebSocket.',
    wsPath: '/ws',
    mutants: mutants.length,
    framework,
  })

  runMutationTests(mutants, testCode, framework, jobId, {
    onProgress: progress => {
      JobStore.update(jobId, {
        progress,
      })

      publishJobEvent(jobId, {
        type: 'job_progress',
        jobId,
        status: 'running',
        progress,
      })
    },
  })
    .then(report => {
      JobStore.update(jobId, {
        status: 'completed',
        finishedAt: report.finishedAt,
        mutationScore: report.mutationScore,
        report,
        progress: report.progress ?? {
          total: mutants.length,
          processed: mutants.length,
          killed: report.killed ?? 0,
          survived: report.survived ?? 0,
        },
      })

      publishJobEvent(jobId, {
        type: 'job_completed',
        jobId,
        status: 'completed',
        finishedAt: report.finishedAt,
        mutationScore: report.mutationScore,
        report,
      })

      logger.info('Job terminé', {
        jobId,
        score: report.mutationScore,
      })
    })
    .catch(err => {
      const finishedAt = new Date().toISOString()

      JobStore.update(jobId, {
        status: 'failed',
        finishedAt,
        error: err.message,
      })

      publishJobEvent(jobId, {
        type: 'job_failed',
        jobId,
        status: 'failed',
        finishedAt,
        error: err.message,
      })

      logger.error('Job échoué', {
        jobId,
        error: err.message,
      })
    })
}

// ─── handleGetReport ────────────────────────────────────────────────────────
export async function handleGetReport(req, res) {
  const { jobId } = req.params
  const job = JobStore.get(jobId)

  if (!job) {
    return fail(res, 404, `Job introuvable: ${jobId}`)
  }

  return ok(res, 200, job)
}