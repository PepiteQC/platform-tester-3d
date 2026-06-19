import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { requireAdmin } from '../middleware/auth.mjs';
import {
  handleCompile,
  handleAnalyze,
  handleMutate,
  handleRunMutation,
  handleGetReport,
} from '../controllers/audit.controller.mjs';

export const auditRouter = Router();

const SAFE_FILENAME = /^(?!.*\.\.)[a-zA-Z0-9_-]{1,64}\.sol$/;

const soliditySourceSchema = z.object({
  sourceCode: z
    .string()
    .min(10, 'Le contrat est trop court.')
    .max(250_000, 'Le contrat dépasse la limite autorisée.')
    .refine(
      (code) => code.includes('pragma solidity') || code.includes('contract '),
      'Le code ne semble pas être du Solidity valide.',
    ),

  fileName: z
    .string()
    .regex(SAFE_FILENAME, 'Nom de fichier invalide. Format attendu: Example.sol'),

  compilerVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version compilateur invalide.')
    .optional()
    .default('0.8.24'),
});

const mutateSchema = soliditySourceSchema.extend({
  operators: z
    .array(z.enum(['BCR', 'AOR', 'BLR', 'RQD', 'VCR']))
    .min(1)
    .max(5)
    .default(['BCR', 'AOR', 'BLR']),

  testCode: z.string().min(10).max(100_000).optional(),

  framework: z.enum(['foundry', 'hardhat']).default('foundry'),

  maxMutants: z.number().int().min(1).max(100).default(20),
});

function validate(schema) {
  return (req, res, next) => {
    req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    res.setHeader('X-Correlation-ID', req.correlationId);

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_FAILED',
        traceId: req.correlationId,
        details: result.error.flatten().fieldErrors,
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

function validateUUIDParam(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_UUID',
        message: `${paramName} invalide.`,
      });
    }

    next();
  };
}

auditRouter.post('/compile', validate(soliditySourceSchema), handleCompile);

auditRouter.post('/analyze', validate(soliditySourceSchema), handleAnalyze);

auditRouter.post('/mutate', validate(mutateSchema), handleMutate);

auditRouter.post('/run', requireAdmin, validate(mutateSchema), handleRunMutation);

auditRouter.get('/report/:jobId', validateUUIDParam('jobId'), handleGetReport);

auditRouter.use((err, req, res, _next) => {
  console.error('[AuditRouter]', err);

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Unexpected audit error.',
    traceId: req.correlationId || null,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});