import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth.mjs';
import {
  handleCompile,
  handleAnalyze,
  handleMutate,
  handleRunMutation,
  handleGetReport,
} from '../controllers/audit.controller.mjs';

export const auditRouter = Router();

// ─── Schémas de validation Zod ──────────────────────────────────────────────

// Regex sécurisé: lettres, chiffres, underscores, tirets uniquement
const SAFE_FILENAME = /^[a-zA-Z0-9_-]{1,64}\.sol$/;

// Validation du code Solidity
const soliditySourceSchema = z.object({
  sourceCode: z
    .string()
    .min(10,    'Le contrat est trop court.')
    .max(100_000, 'Le contrat dépasse 100kb.')
    .refine(
      code => code.includes('pragma solidity') || code.includes('contract '),
      'Le code ne semble pas être du Solidity valide.'
    ),
  fileName: z
    .string()
    .regex(SAFE_FILENAME, 'Nom de fichier invalide. Utilisez uniquement [a-zA-Z0-9_-].sol'),
  compilerVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
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

// ─── Middleware de validation générique ────────────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation échouée',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /api/audit/compile — Compile et extrait l'ABI + AST
auditRouter.post('/compile',
  validate(soliditySourceSchema),
  handleCompile
);

// POST /api/audit/analyze — Analyse l'AST (contrats, fonctions, events)
auditRouter.post('/analyze',
  validate(soliditySourceSchema),
  handleAnalyze
);

// POST /api/audit/mutate — Génère les mutants (sans les exécuter)
auditRouter.post('/mutate',
  validate(mutateSchema),
  handleMutate
);

// POST /api/audit/run — Lance les tests sur les mutants (protégé)
auditRouter.post('/run',
  requireAdmin,
  validate(mutateSchema),
  handleRunMutation
);

// GET /api/audit/report/:jobId — Récupère un rapport
auditRouter.get('/report/:jobId',
  (req, res, next) => {
    if (!/^[a-f0-9-]{36}$/.test(req.params.jobId)) {
      return res.status(400).json({ success: false, error: 'jobId invalide.' });
    }
    next();
  },
  handleGetReport
);