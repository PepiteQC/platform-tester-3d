import crypto from 'node:crypto';
import { compileSolidity, analyzeSoliditySource } from '../services/solidity.service.mjs';
import { generateMutants } from '../services/mutation.service.mjs';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('audit-controller');

const reports = new Map();

export async function handleCompile(req, res, next) {
  try {
    const startedAt = performance.now();
    const body = req.validatedBody;

    const result = compileSolidity({
      sourceCode: body.sourceCode,
      fileName: body.fileName,
      compilerVersion: body.compilerVersion,
    });

    const durationMs = Math.round(performance.now() - startedAt);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: 'SOLIDITY_COMPILE_FAILED',
        traceId: req.correlationId,
        durationMs,
        data: result,
      });
    }

    return res.json({
      success: true,
      traceId: req.correlationId,
      durationMs,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleAnalyze(req, res, next) {
  try {
    const startedAt = performance.now();
    const body = req.validatedBody;

    const result = analyzeSoliditySource({
      sourceCode: body.sourceCode,
      fileName: body.fileName,
    });

    const durationMs = Math.round(performance.now() - startedAt);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: 'SOLIDITY_ANALYZE_FAILED',
        traceId: req.correlationId,
        durationMs,
        data: result,
      });
    }

    return res.json({
      success: true,
      traceId: req.correlationId,
      durationMs,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleMutate(req, res, next) {
  try {
    const startedAt = performance.now();
    const jobId = crypto.randomUUID();
    const body = req.validatedBody;

    logger.info({ jobId, fileName: body.fileName }, 'Starting mutation generation');

    // Vraie génération de mutants
    const mutationResult = generateMutants({
      sourceCode: body.sourceCode,
      fileName: body.fileName,
      operators: body.operators,
      maxMutants: body.maxMutants,
    });

    if (!mutationResult.success) {
      return res.status(422).json({
        success: false,
        error: 'MUTATION_FAILED',
        traceId: req.correlationId,
        data: mutationResult,
      });
    }

    const durationMs = Math.round(performance.now() - startedAt);

    const report = {
      jobId,
      type: 'mutation_generation',
      status: 'completed',
      createdAt: new Date().toISOString(),
      durationMs,
      traceId: req.correlationId,
      input: {
        fileName: body.fileName,
        operators: body.operators,
        maxMutants: body.maxMutants,
        framework: body.framework,
        originalSize: body.sourceCode.length,
      },
      summary: {
        totalCandidates: mutationResult.totalCandidates,
        generatedMutants: mutationResult.generatedCount,
        operatorsUsed: mutationResult.operatorsUsed,
        operatorBreakdown: countByOperator(mutationResult.mutants),
        affectedLines: [...new Set(mutationResult.mutants.map(m => m.line))].sort((a, b) => a - b),
      },
      mutants: mutationResult.mutants,
    };

    reports.set(jobId, report);

    logger.info(
      { jobId, count: mutationResult.generatedCount, durationMs },
      'Mutation generation completed'
    );

    return res.status(202).json({
      success: true,
      message: `Generated ${mutationResult.generatedCount} mutants.`,
      traceId: req.correlationId,
      durationMs,
      data: {
        jobId,
        status: report.status,
        reportUrl: `/api/audit/report/${jobId}`,
        summary: report.summary,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleRunMutation(req, res, next) {
  try {
    const jobId = crypto.randomUUID();
    const body = req.validatedBody;

    // Pour l'instant : génération + simulation des résultats
    const mutationResult = generateMutants({
      sourceCode: body.sourceCode,
      fileName: body.fileName,
      operators: body.operators,
      maxMutants: body.maxMutants,
    });

    if (!mutationResult.success) {
      return res.status(422).json({
        success: false,
        error: 'MUTATION_FAILED',
        data: mutationResult,
      });
    }

    // Simulation : marquer aléatoirement comme killed/survived
    // (Sera remplacé par Foundry/Hardhat dans le prochain sprint)
    const mutantResults = mutationResult.mutants.map(mutant => {
      const random = Math.random();
      let status;
      if (random < 0.7) status = 'killed';
      else if (random < 0.95) status = 'survived';
      else status = 'timeout';

      return { ...mutant, testStatus: status };
    });

    const killed = mutantResults.filter(m => m.testStatus === 'killed').length;
    const survived = mutantResults.filter(m => m.testStatus === 'survived').length;
    const timeout = mutantResults.filter(m => m.testStatus === 'timeout').length;
    const total = mutantResults.length;
    const mutationScore = total > 0 ? Math.round((killed / total) * 100) : 0;

    const report = {
      jobId,
      type: 'mutation_run',
      status: 'completed',
      createdAt: new Date().toISOString(),
      traceId: req.correlationId,
      input: {
        fileName: body.fileName,
        operators: body.operators,
        framework: body.framework,
      },
      summary: {
        total,
        killed,
        survived,
        timeout,
        mutationScore,
        scoreLabel: getScoreLabel(mutationScore),
        note: 'Simulated results. Real test execution requires Foundry/Hardhat integration.',
      },
      survivedMutants: mutantResults.filter(m => m.testStatus === 'survived'),
      mutants: mutantResults,
    };

    reports.set(jobId, report);

    return res.status(202).json({
      success: true,
      message: `Mutation testing completed. Score: ${mutationScore}%`,
      traceId: req.correlationId,
      data: {
        jobId,
        status: report.status,
        reportUrl: `/api/audit/report/${jobId}`,
        summary: report.summary,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetReport(req, res, next) {
  try {
    const report = reports.get(req.params.jobId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'REPORT_NOT_FOUND',
        message: 'No report exists for this jobId.',
      });
    }

    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════════════

function countByOperator(mutants) {
  const counts = {};
  for (const mutant of mutants) {
    counts[mutant.operator] = (counts[mutant.operator] || 0) + 1;
  }
  return counts;
}

function getScoreLabel(score) {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 60) return 'ACCEPTABLE';
  if (score >= 40) return 'WEAK';
  return 'CRITICAL';
}