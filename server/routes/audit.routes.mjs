import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  handleAnalyze,
  handleCompile,
  handleGetReport
} from '../controllers/audit.controller.mjs';
import { requireAdmin } from '../middleware/auth.mjs';
import { AuditQueue } from '../services/queue/auditQueue.mjs'; // BullMQ / Redis
import { AppError } from '../utils/AppError.mjs';

export const auditRouter = Router();

// ─── 🛡️ 1. SCHÉMAS DE VALIDATION ZOD (Niveau Entreprise) ────────────────────

// Protection contre Path Traversal (ex: ../../etc/passwd.sol) et ReDoS
const SAFE_FILENAME = /^(?!.*\.\.)[a-zA-Z0-9_-]{1,64}\.sol$/;

// Regex robuste pour détecter le pragma Solidity (ignore les commentaires)
const PRAGMA_REGEX = /(^|\n)\s*pragma\s+solidity\s+[\^~>=<]*\d+\.\d+\.\d+\s*;/;

const soliditySourceSchema = z.object({
  sourceCode: z
    .string()
    .min(50, 'Le contrat est suspect (trop court).')
    .max(250_000, 'Limite de 250kb dépassée. Contactez-nous pour les contrats enterprise.')
    .refine(code => PRAGMA_REGEX.test(code), 'Pragma Solidity valide manquant ou mal formé.')
    .refine(code => code.includes('SPDX-License-Identifier'), 'Licence SPDX manquante (Requis pour l\'audit).'),
  
  fileName: z
    .string()
    .regex(SAFE_FILENAME, 'Nom de fichier invalide. Caractères autorisés: [a-zA-Z0-9_-].sol'),
  
  compilerVersion: z
    .string()
    .regex(/^0\.[8-9]\.\d+$/, 'Seules les versions 0.8.x+ sont supportées pour la sécurité.')
    .default('0.8.24'),
});

const mutateSchema = soliditySourceSchema.extend({
  operators: z
    .array(z.enum(['BCR', 'AOR', 'BLR', 'RQD', 'VCR', 'CRR']))
    .min(1, 'Sélectionnez au moins un opérateur de mutation.')
    .max(6)
    .default(['BCR', 'AOR', 'BLR']),
  
  testCode: z
    .string()
    .min(20, 'Code de test invalide.')
    .max(500_000, 'Suite de tests trop volumineuse.')
    .optional(),
  
  framework: z.enum(['foundry', 'hardhat']).default('foundry'),
  
  maxMutants: z
    .number()
    .int()
    .min(1)
    .max(500, 'Limite gratuite: 500. Contactez le support pour plus.')
    .default(50),
    
  // 🔥 Idempotence Key : Empêche de relancer 10 fois la même mutation par erreur
  idempotencyKey: z.string().uuid().optional(), 
});

// ─── ⚙️ 2. MIDDLEWARES LOGISTIQUES (Le Pattern) ──────────────────────────────

/**
 * Middleware de Validation & Télémétrie Distribuée
 * Injecte un Correlation-ID pour tracer la requête dans toute l'infrastructure.
 */
function validateAndTrace(schema) {
  return (req, res, next) => {
    // 1. Telemetry
    req.correlationId = req.headers['x-correlation-id'] || uuidv4();
    res.setHeader('X-Correlation-ID', req.correlationId);

    // 2. Validation
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PAYLOAD',
        traceId: req.correlationId,
        details: result.error.flatten().fieldErrors,
      });
    }
    
    req.validatedBody = result.data;
    next();
  };
}

/**
 * Middleware de "Resource Gating" (File d'attente)
 * Transforme les requêtes synchrones lourdes en Jobs Asynchrones (202 Accepted)
 */
function dispatchToQueue(jobType) {
  return async (req, res, next) => {
    try {
      const jobId = uuidv4();
      
      // Push vers Redis/BullMQ (Ne bloque pas le Event Loop de Node.js)
      await AuditQueue.add(jobType, {
        jobId,
        correlationId: req.correlationId,
        userId: req.user?.id, // Supposant que l'auth injecte req.user
        payload: req.validatedBody,
        timestamp: Date.now()
      }, {
        jobId: req.validatedBody.idempotencyKey || jobId, // Garantit l'idempotence
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 }
      });

      // 🔥 Le Pattern Async : On ne bloque pas le client.
      res.status(202).json({
        success: true,
        message: `Tâche ${jobType} acceptée et mise en file d'attente.`,
        traceId: req.correlationId,
        data: {
          jobId,
          statusUrl: `/api/audit/report/${jobId}`,
          estimatedWait: 'Consultez le WebSocket ou le polling.'
        }
      });
    } catch (error) {
      next(new AppError('QUEUE_DISPATCH_FAILED', 500, error.message));
    }
  };
}

/**
 * Middleware de validation d'UUID (Remplace le inline moche)
 */
function validateUUIDParam(paramName) {
  return (req, res, next) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params[paramName])) {
      return res.status(400).json({ 
        success: false, 
        error: 'INVALID_UUID',
        message: `Le paramètre ${paramName} doit être un UUID v4 valide.` 
      });
    }
    next();
  };
}

// ─── 🚦 3. RATE LIMITING SPÉCIFIQUE (Protection CPU) ─────────────────────────

// La mutation testing consomme des milliers de cycles CPU.
const heavyComputeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 lancements de mutation par IP/User toutes les 15 min
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Vous avez atteint la limite de calcul de mutation. Veuillez patienter.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── 🛣️ 4. ROUTES (Orchestration du Pipeline) ────────────────────────────────

// [SYNCHRONE] Compilation & Extraction AST (Rapide, < 3 secondes)
auditRouter.post('/compile',
  validateAndTrace(soliditySourceSchema),
  handleCompile
);

// [SYNCHRONE] Analyse Statique (Rapide, < 5 secondes)
auditRouter.post('/analyze',
  validateAndTrace(soliditySourceSchema),
  handleAnalyze
);

// [ASYNC] Génération des Mutants (Lourd, dispatché en Queue)
auditRouter.post('/mutate',
  validateAndTrace(mutateSchema),
  heavyComputeLimiter,
  dispatchToQueue('GENERATE_MUTANTS')
);

// [ASYNC + ADMIN] Exécution des Tests sur Mutants (Très Lourd, Protégé)
auditRouter.post('/run',
  requireAdmin,
  validateAndTrace(mutateSchema),
  heavyComputeLimiter,
  dispatchToQueue('RUN_MUTATION_TESTS')
);

// [SYNC] Récupération d'état / Rapport (State Machine Inspector)
auditRouter.get('/report/:jobId',
  validateUUIDParam('jobId'),
  handleGetReport
);

// ─── 🚨 5. GESTIONNAIRE D'ERREURS GLOBAL DU ROUTEUR ──────────────────────────
auditRouter.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(status).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Une erreur critique est survenue dans le pipeline d\'audit.',
    traceId: req.correlationId || 'N/A',
    // En prod, on ne renvoie jamais la stack trace au client
    stack: isProduction ? undefined : err.stack 
  });
});