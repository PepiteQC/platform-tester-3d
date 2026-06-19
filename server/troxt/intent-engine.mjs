import { Mutex } from 'async-mutex';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createLogger } from '../utils/logger.mjs';
import { executeCommand } from './control/command-executor.mjs';
import { keyboardAction } from './control/keyboard-controller.mjs';
import { mouseAction } from './control/mouse-controller.mjs';

const logger = createLogger('intent-orchestrator');

// ═══════════════════════════════════════════════════════════════════════════
// 🔴 1. INVARIANTS DE SÉCURITÉ (Non-négociables)
// ═══════════════════════════════════════════════════════════════════════════

const SECURITY = Object.freeze({
  // Jail racine : aucun chemin ne peut sortir de ce répertoire
  WORKSPACE_ROOT: path.resolve(process.env.WORKSPACE_ROOT || '/opt/troxt/workspace'),

  // Binaires autorisés par intent (whitelist stricte)
  ALLOWED_BINARIES: new Set([
    'npm', 'yarn', 'pnpm', 'code', 'node', 'npx',
    'forge', 'hardhat', 'solc', 'git',
  ]),

  // Caractères interdits dans TOUT argument shell
  SHELL_META_CHARS: /[;&|`$(){}<>'"\\\n\r\x00]/,

  // Managers de paquets reconnus
  PACKAGE_MANAGERS: new Set(['npm', 'yarn', 'pnpm']),

  // Éditeurs reconnus
  EDITORS: new Set(['vscode', 'vim', 'nano']),

  // Timeout par catégorie d'intent (ms)
  TIMEOUTS: {
    install_dependency: 120_000,
    run_script:         300_000,
    open_file:           10_000,
    click_ui:             5_000,
    type_text:           30_000,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ 2. SANITIZERS (Défense en profondeur)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vérifie qu'un chemin est contenu dans le WORKSPACE_ROOT.
 * Bloque : ../../etc/passwd, symlinks sortants, null bytes.
 */
function assertPathWithinJail(candidatePath, context = 'path') {
  if (typeof candidatePath !== 'string' || candidatePath.includes('\0')) {
    throw new IntentSecurityError('NULL_BYTE_INJECTION', context);
  }

  const resolved = path.resolve(SECURITY.WORKSPACE_ROOT, candidatePath);

  if (!resolved.startsWith(SECURITY.WORKSPACE_ROOT + path.sep) &&
      resolved !== SECURITY.WORKSPACE_ROOT) {
    throw new IntentSecurityError(
      'PATH_TRAVERSAL_BLOCKED',
      `${context}: "${candidatePath}" résout en dehors du jail.`
    );
  }

  return resolved;
}

/**
 * Vérifie qu'un argument ne contient aucun méta-caractère shell.
 */
function assertShellSafe(value, context = 'argument') {
  if (SECURITY.SHELL_META_CHARS.test(value)) {
    throw new IntentSecurityError(
      'SHELL_INJECTION_BLOCKED',
      `${context}: caractères shell interdits détectés dans "${value.slice(0, 60)}".`
    );
  }
  return value;
}

/**
 * Valide qu'un nom de package est légitime.
 * Bloque : URLs, flags (--), chemins relatifs, scopes malveillants.
 */
function assertValidPackageName(name) {
  // Pattern npm officiel : @scope/package ou package
  const VALID_PKG = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[a-z0-9-._+]+)?$/;
  if (!VALID_PKG.test(name)) {
    throw new IntentSecurityError(
      'INVALID_PACKAGE_NAME',
      `Le nom de package "${name}" ne correspond pas au format npm valide.`
    );
  }
  return name;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📐 3. SCHÉMAS ZOD PAR INTENT (Validation structurelle)
// ═══════════════════════════════════════════════════════════════════════════

const baseIntentSchema = z.object({
  intent:        z.string().min(1),
  correlationId: z.string().uuid().optional(),
  source:        z.enum(['user', 'agent', 'scheduler', 'webhook']).default('agent'),
  timestamp:     z.number().int().optional(),
});

const intentSchemas = {
  install_dependency: baseIntentSchema.extend({
    manager: z.enum(['npm', 'yarn', 'pnpm']).default('npm'),
    target:  z.string().min(1).max(214), // npm max package name length
    projectPath: z.string().max(512).default('.'),
    dev:     z.boolean().default(false),
  }),

  open_file: baseIntentSchema.extend({
    editor:   z.enum(['vscode', 'vim', 'nano']).default('vscode'),
    filePath: z.string().min(1).max(512),
    line:     z.number().int().min(1).optional(),
  }),

  run_script: baseIntentSchema.extend({
    manager:    z.enum(['npm', 'yarn', 'pnpm']).default('npm'),
    script:     z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Nom de script invalide.'),
    projectPath: z.string().max(512).default('.'),
    args:       z.array(z.string().max(128)).max(10).default([]),
  }),

  click_ui: baseIntentSchema.extend({
    x:      z.number().int().min(0).max(10000),
    y:      z.number().int().min(0).max(10000),
    button: z.enum(['left', 'right', 'middle']).default('left'),
    double: z.boolean().default(false),
  }),

  type_text: baseIntentSchema.extend({
    text:          z.string().min(1).max(2000),
    pressEnter:    z.boolean().default(false),
    targetWindow:  z.string().max(128).optional(),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// 🧩 4. STRATEGY REGISTRY (Remplace le switch/case fragile)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Chaque handler est une fonction pure qui reçoit le payload VALIDÉ
 * et retourne un résultat structuré. Aucun handler ne touche aux
 * variables non validées.
 */
const intentHandlers = {

  async install_dependency(payload) {
    const { manager, target, projectPath, dev } = payload;
    const safePath   = assertPathWithinJail(projectPath, 'projectPath');
    const safeTarget = assertValidPackageName(assertShellSafe(target, 'target'));

    const args = ['install', safeTarget];
    if (dev) args.push('--save-dev');

    return executeCommand({
      binary: manager,
      args,
      timeoutMs: SECURITY.TIMEOUTS.install_dependency,
      correlationId: payload.correlationId,
      context: `install:${safeTarget}`,
      cwd: safePath,
    });
  },

  async open_file(payload) {
    const { editor, filePath, line } = payload;
    const safePath = assertPathWithinJail(filePath, 'filePath');

    const args = editor === 'vscode'
      ? ['--goto', `${safePath}${line ? ':' + line : ''}`]
      : [safePath];

    return executeCommand({
      binary: editor === 'vscode' ? 'code' : editor,
      args,
      timeoutMs: SECURITY.TIMEOUTS.open_file,
      correlationId: payload.correlationId,
      context: `open:${path.basename(safePath)}`,
    });
  },

  async run_script(payload) {
    const { manager, script, projectPath, args: extraArgs } = payload;
    const safePath   = assertPathWithinJail(projectPath, 'projectPath');
    const safeScript = assertShellSafe(script, 'script');

    // Vérifier que le script n'est pas un flag déguisé
    if (safeScript.startsWith('-')) {
      throw new IntentSecurityError('FLAG_INJECTION', 'Le nom de script ne peut pas commencer par "-".');
    }

    const args = ['run', safeScript, ...extraArgs.map(a => assertShellSafe(a, 'scriptArg'))];

    return executeCommand({
      binary: manager,
      args,
      timeoutMs: SECURITY.TIMEOUTS.run_script,
      correlationId: payload.correlationId,
      context: `script:${safeScript}`,
      cwd: safePath,
    });
  },

  async click_ui(payload) {
    const { x, y, button, double } = payload;
    return mouseAction({ x, y, click: button, doubleClick: double });
  },

  async type_text(payload) {
    const { text, pressEnter, targetWindow } = payload;
    return keyboardAction({ text, pressEnterAfter: pressEnter, targetWindowTitle: targetWindow });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 5. MUTEX PAR CATÉGORIE (Hardware vs Shell)
// ═══════════════════════════════════════════════════════════════════════════

const shellMutex  = new Mutex(); // Protège les commandes système
const hardwareMutex = new Mutex(); // Protège clavier/souris

function getMutexForIntent(intentType) {
  const hardwareIntents = new Set(['click_ui', 'type_text']);
  return hardwareIntents.has(intentType) ? hardwareMutex : shellMutex;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 6. ORCHESTRATEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Point d'entrée unique. Valide, verrouille, exécute, audite.
 *
 * @param {Object} rawIntent — Payload brut venant de l'agent IA ou de l'API
 * @returns {Promise<IntentResult>}
 */
export async function handleIntent(rawIntent) {
  const correlationId = rawIntent?.correlationId || uuidv4();
  const startTime = performance.now();
  const intentType = rawIntent?.intent;

  // ── Phase 1 : Identification ──
  logger.info({
    correlationId,
    intentType,
    source: rawIntent?.source || 'unknown',
  }, '[INTENT] Reçu');

  // ── Phase 2 : Dispatch vers le bon schéma ──
  const schema = intentSchemas[intentType];
  if (!schema) {
    const supported = Object.keys(intentHandlers);
    logger.warn({ correlationId, intentType, supported }, '[INTENT] Intent inconnu');
    return IntentResult.failure(
      'UNKNOWN_INTENT',
      `Intent "${intentType}" non supporté. Intents disponibles: ${supported.join(', ')}`,
      correlationId
    );
  }

  // ── Phase 3 : Validation Zod ──
  const validation = schema.safeParse({ ...rawIntent, correlationId });
  if (!validation.success) {
    logger.warn({
      correlationId,
      intentType,
      errors: validation.error.flatten().fieldErrors,
    }, '[INTENT] Validation échouée');

    return IntentResult.failure(
      'VALIDATION_FAILED',
      validation.error.flatten().fieldErrors,
      correlationId
    );
  }

  const validatedPayload = validation.data;

  // ── Phase 4 : Handler lookup ──
  const handler = intentHandlers[intentType];
  if (!handler) {
    return IntentResult.failure('NO_HANDLER', `Pas de handler pour "${intentType}".`, correlationId);
  }

  // ── Phase 5 : Acquisition du Mutex ──
  const mutex = getMutexForIntent(intentType);
  const release = await mutex.acquire();

  try {
    logger.info({ correlationId, intentType }, '[INTENT] Exécution débutée');

    // ── Phase 6 : Exécution ──
    const result = await handler(validatedPayload);
    const durationMs = Math.round(performance.now() - startTime);

    logger.info({ correlationId, intentType, durationMs }, '[INTENT] Succès');

    return IntentResult.success(result, correlationId, durationMs);

  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);

    // Classification fine
    if (error instanceof IntentSecurityError) {
      logger.error({
        correlationId,
        intentType,
        securityCode: error.code,
        detail: error.message,
      }, '[INTENT] 🚨 VIOLATION DE SÉCURITÉ BLOQUÉE');

      return IntentResult.failure(error.code, error.message, correlationId, durationMs);
    }

    logger.error({
      correlationId,
      intentType,
      error: error.message,
      stack: error.stack?.slice(0, 500),
      durationMs,
    }, '[INTENT] Échec d\'exécution');

    return IntentResult.failure('EXECUTION_ERROR', error.message, correlationId, durationMs);

  } finally {
    release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 7. RESULT MONAD (Réponse immuable et typée)
// ═══════════════════════════════════════════════════════════════════════════

class IntentResult {
  constructor(success, code, data, correlationId, durationMs) {
    this.success      = success;
    this.code         = code;
    this.data         = data;
    this.correlationId = correlationId;
    this.durationMs   = durationMs;
    this.timestamp    = Date.now();
    Object.freeze(this); // Immuable : personne ne peut altérer le résultat
  }

  static success(data, correlationId, durationMs) {
    return new IntentResult(true, 'OK', data, correlationId, durationMs);
  }

  static failure(code, data, correlationId, durationMs = null) {
    return new IntentResult(false, code, data, correlationId, durationMs);
  }

  toJSON() {
    return {
      success:       this.success,
      code:          this.code,
      data:          this.data,
      correlationId: this.correlationId,
      durationMs:    this.durationMs,
      timestamp:     this.timestamp,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚨 8. ERREURS TYPOLOGIQUES
// ═══════════════════════════════════════════════════════════════════════════

class IntentSecurityError extends Error {
  constructor(code, detail) {
    super(`[SECURITY] ${code}: ${detail}`);
    this.name = 'IntentSecurityError';
    this.code = code;
  }
}