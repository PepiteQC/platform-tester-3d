import { v4 as uuidv4 }        from 'uuid'
import { compileSolidity, CompilerError } from '../services/compiler.mjs'
import { analyzeAST }           from '../services/ast-analyzer.mjs'
import { generateMutants }      from '../services/mutator.mjs'
import { runMutationTests }     from '../services/runner.mjs'
import { logger }               from '../utils/logger.mjs'
import { JobStore }             from '../store/JobStore.mjs'

// ─── handleCompile ──────────────────────────────────────────────────────────
export async function handleCompile(req, res) {
  const { sourceCode, fileName, compilerVersion } = req.validatedBody

  try {
    const result = await compileSolidity(sourceCode, fileName, compilerVersion)

    return res.status(200).json({
      success: true,
      data:    result,
    })
  } catch (err) {
    if (err instanceof CompilerError) {
      return res.status(422).json({
        success: false,
        error:   err.message,
        details: err.details,
      })
    }
    throw err
  }
}

// ─── handleAnalyze ──────────────────────────────────────────────────────────
export async function handleAnalyze(req, res) {
  const { sourceCode } = req.validatedBody

  const analysis = analyzeAST(sourceCode)

  return res.status(200).json({
    success: true,
    data:    analysis,
  })
}

// ─── handleMutate ───────────────────────────────────────────────────────────
export async function handleMutate(req, res) {
  const {
    sourceCode,
    operators,
    maxMutants,
  } = req.validatedBody

  const mutants = generateMutants(sourceCode, operators, maxMutants)

  return res.status(200).json({
    success: true,
    data: {
      count:     mutants.length,
      operators,
      mutants:   mutants.map(m => ({
        id:          m.id,
        operator:    m.operator,
        description: m.description,
        location:    m.location,
        original:    m.original,
        mutated:     m.mutated,
        status:      m.status,
      })),
    },
  })
}

// ─── handleRunMutation ──────────────────────────────────────────────────────
export async function handleRunMutation(req, res) {
  const {
    sourceCode,
    fileName,
    operators,
    testCode,
    framework,
    maxMutants,
  } = req.validatedBody

  if (!testCode) {
    return res.status(400).json({
      success: false,
      error:   'Le champ testCode est requis pour exécuter les tests de mutation.',
    })
  }

  const jobId  = uuidv4()
  const mutants = generateMutants(sourceCode, operators, maxMutants)

  if (mutants.length === 0) {
    return res.status(422).json({
      success: false,
      error:   'Aucun mutant généré. Vérifiez vos opérateurs et votre code source.',
    })
  }

  logger.info('Job de mutation démarré', {
    jobId,
    fileName,
    mutants:   mutants.length,
    operators,
    framework,
  })

  JobStore.register(jobId, {
    status:    'running',
    startedAt: new Date().toISOString(),
    mutants:   mutants.length,
    framework,
    fileName,
  })

  res.status(202).json({
    success: true,
    data: {
      jobId,
      message:  'Job de mutation démarré. Suivez la progression via WebSocket.',
      wsPath:   `/ws`,
      mutants:  mutants.length,
      framework,
    },
  })

  runMutationTests(mutants, testCode, framework, jobId)
    .then(report => {
      JobStore.update(jobId, {
        status:        'completed',
        finishedAt:    report.finishedAt,
        mutationScore: report.mutationScore,
        report,
      })

      logger.info('Job terminé', {
        jobId,
        score: report.mutationScore,
      })
    })
    .catch(err => {
      JobStore.update(jobId, {
        status:     'failed',
        finishedAt: new Date().toISOString(),
        error:      err.message,
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
    return res.status(404).json({
      success: false,
      error:   `Job introuvable: ${jobId}`,
    })
  }

  return res.status(200).json({
    success: true,
    data:    job,
  })
}