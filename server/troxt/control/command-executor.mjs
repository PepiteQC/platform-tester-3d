import { execFile } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../utils/logger.mjs'; // Winston / Pino structuré

const logger = createLogger('process-executor');

// ─── 🛡️ 1. CONFIGURATION CENTRALISÉE ────────────────────────────────────────

const PROCESS_CONFIG = Object.freeze({
  // ⏱️ Timeouts défensifs (le compilateur Solidity ne devrait jamais dépasser 60s)
  defaultTimeoutMs: 60_000,
  compileTimeoutMs: 30_000,
  analyzeTimeoutMs: 45_000,
  testTimeoutMs: 300_000,       // 5 min pour les suites de tests
  mutateTimeoutMs: 600_000,     // 10 min pour la mutation testing

  // 🧊 Limites mémoire (empêche un contrat malveillant de faire OOM)
  maxBuffer: 10 * 1024 * 1024,  // 10 Mo de sortie max

  // 🔁 Retry config (erreurs transitoires : réseau, fichiers temporaires, etc.)
  maxRetries: 2,
  retryDelayMs: 1_000,

  // 🚫 Commandes strictement interdites (defense-in-depth)
  blockedPatterns: [
    /&&/, /\|\|/, /;/, /\$\(/, /\$\{/, /`/, />/, /</, /\n/, /\r/,
  ],
});

// ─── 🔒 2. SANITIZER & VALIDATEUR DE COMMANDES ───────────────────────────────

/**
 * Vérifie qu'aucune injection shell n'est tentée.
 * Bloque les opérateurs de chaînage, substitutions, redirections, et newlines.
 */
function sanitizeCommandParts(...parts) {
  for (const part of parts) {
    const str = String(part);
    for (const pattern of PROCESS_CONFIG.blockedPatterns) {
      if (pattern.test(str)) {
        throw new Error(
          `SECURITY_BLOCKED: La commande contient un motif interdit: "${str.slice(0, 40)}..."`
        );
      }
    }
  }
}

/**
 * Valide qu'un exécutable n'existe que dans un chemin whitelisté.
 * Empêche l'exécution de `rm -rf /` déguisée en `solc`.
 */
const ALLOWED_BINARIES = new Set([
  'solc',
  'solcjs',
  'node',
  'npx',
  'forge',
  'hardhat',
]);

function resolveBinary(binaryName) {
  if (!ALLOWED_BINARIES.has(binaryName)) {
    throw new Error(`SECURITY: Le binaire "${binaryName}" n'est pas autorisé.`);
  }
  // En production, on devrait utiliser un chemin absolu résolu via which
  // ou mieux : un container Docker isolé
  return binaryName;
}

// ─── ⚙️ 3. EXECUTOR SÉCURISÉ AVEC RETRY, TIMEOUT & OBSERVABILITÉ ────────────

/**
 * Exécute une commande de manière sécurisée avec :
 *  - Injection de dépendances impossible (execFile, pas exec)
 *  - Timeout configurable
 *  - Retry avec backoff exponentiel
 *  - Limite de buffer mémoire
 *  - Logging structuré avec correlationId
 *  - Code de sortie vérifié
 *
 * @param {Object}   options
 * @param {string}   options.binary     — L'exécutable (whitelisté)
 * @param {string[]} options.args       — Arguments (jamais interprétés par un shell)
 * @param {number}   options.timeoutMs  — Timeout en ms
 * @param {number}   options.maxBuffer  — Limite de sortie en octets
 * @param {string}   options.correlationId — Pour le tracing distribué
 * @param {string}   options.context    — Description humaine pour les logs
 * @param {Object}   options.env        — Variables d'environnement supplémentaires
 */
export async function executeCommand({
  binary,
  args = [],
  timeoutMs = PROCESS_CONFIG.defaultTimeoutMs,
  maxBuffer = PROCESS_CONFIG.maxBuffer,
  correlationId = 'unknown',
  context = 'unspecified',
  env = {},
}) {
  const resolvedBinary = resolveBinary(binary);

  // 🔒 Sanitization des arguments
  sanitizeCommandParts(resolvedBinary, ...args);

  const execFileAsync = promisify(execFile);
  const startTime = performance.now();
  let lastError = null;

  for (let attempt = 1; attempt <= PROCESS_CONFIG.maxRetries + 1; attempt++) {
    try {
      logger.info({
        correlationId,
        context,
        binary: resolvedBinary,
        args,
        attempt,
        timeoutMs,
      }, '[EXEC] Démarrage du processus');

      const result = await execFileAsync(resolvedBinary, args, {
        timeout: timeoutMs,
        maxBuffer,
        env: {
          ...process.env,          // Hériter PATH, HOME, etc.
          ...env,                  // Surcharges spécifiques (SOLC_VERSION, etc.)
          NODE_ENV: process.env.NODE_ENV,
        },
        cwd: process.env.WORKSPACE_DIR || '/tmp/audit-workspace',
      });

      const duration = Math.round(performance.now() - startTime);

      // ⚠️ Les warnings du compilateur vont dans stderr mais ne sont pas des erreurs
      if (result.stderr && !result.stdout?.trim()) {
        logger.warn({
          correlationId,
          context,
          stderr: result.stderr.slice(0, 2000), // Tronquer pour les logs
          durationMs: duration,
        }, '[EXEC] Stderr non-vide mais commande réussie');
      }

      logger.info({
        correlationId,
        context,
        exitCode: 0,
        outputLength: result.stdout?.length || 0,
        durationMs: duration,
      }, '[EXEC] Succès');

      return {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
        durationMs: duration,
        correlationId,
      };

    } catch (error) {
      lastError = error;
      const duration = Math.round(performance.now() - startTime);

      // 🔍 Classification précise de l'erreur
      const errorType = classifyError(error);

      logger.error({
        correlationId,
        context,
        binary: resolvedBinary,
        args,
        attempt,
        errorType,
        exitCode: error.code ?? null,
        signal: error.signal ?? null,
        errorMessage: error.message.slice(0, 500),
        stderr: error.stderr?.slice(0, 2000) ?? null,
        durationMs: duration,
        willRetry: attempt <= PROCESS_CONFIG.maxRetries,
      }, '[EXEC] Échec du processus');

      // ❌ Timeout : inutile de retry, ça recommencera
      if (errorType === 'TIMEOUT') {
        throw new ProcessError(
          'PROCESS_TIMEOUT',
          `Le processus "${context}" a dépassé le timeout de ${timeoutMs}ms.`,
          { cause: error, correlationId, context, durationMs: duration }
        );
      }

      // ❌ Code de sortie non-zéro (erreur de compilation, etc.)
      if (errorType === 'EXIT_ERROR') {
        return {
          success: false,
          stdout: error.stdout || '',
          stderr: error.stderr || error.message,
          exitCode: error.code ?? -1,
          signal: error.signal ?? null,
          durationMs: duration,
          correlationId,
        };
      }

      // ⚡ Erreur transitoire : on retry
      if (attempt <= PROCESS_CONFIG.maxRetries) {
        const backoff = PROCESS_CONFIG.retryDelayMs * Math.pow(2, attempt - 1);
        logger.info({ correlationId, attempt, backoffMs: backoff }, '[EXEC] Retry après backoff');
        await sleep(backoff);
        continue;
      }
    }
  }

  // Épuisé tous les retries
  throw new ProcessError(
    'PROCESS_FAILED',
    `Le processus "${context}" a échoué après ${PROCESS_CONFIG.maxRetries + 1} tentatives.`,
    { cause: lastError, correlationId, context }
  );
}

// ─── 🔍 4. CLASSIFICATION DES ERREURS ────────────────────────────────────────

/**
 * Distingue le type d'échec pour un handling précis.
 */
function classifyError(error) {
  if (error.killed && error.signal === 'SIGTERM') return 'TIMEOUT';
  if (error.code === 'ERR_EXEC_FILE_TIMEOUT') return 'TIMEOUT';
  if (error.code === 'ENAMETOOLONG') return 'SECURITY_VIOLATION';
  if (typeof error.code === 'number' && error.code !== 0) return 'EXIT_ERROR';
  return 'UNKNOWN';
}

// ─── 🛠️ 5. UTILITAIRES ──────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class ProcessError extends Error {
  constructor(code, message, { cause, correlationId, context, durationMs } = {}) {
    super(message);
    this.name = 'ProcessError';
    this.code = code;
    this.cause = cause;
    this.correlationId = correlationId;
    this.context = context;
    this.durationMs = durationMs;
  }
}

// ─── 📋 6. EXEMPLES D'UTILISATION ────────────────────────────────────────────

/**
 * Compile un contrat Solidity
 */
export async function compileContract(sourceCode, fileName, compilerVersion, correlationId) {
  return executeCommand({
    binary: 'solc',
    args: [
      '--combined-json', 'abi,ast,bin',
      '--allow-paths', '.',
      `--standard-json`  // Utiliser std-input pour la sécurité
    ],
    timeoutMs: PROCESS_CONFIG.compileTimeoutMs,
    correlationId,
    context: `compile:${fileName}`,
    env: { SOLC_VERSION: compilerVersion },
  });
}

/**
 * Lance la mutation testing via Foundry
 */
export async function runMutationTests(projectPath, correlationId) {
  return executeCommand({
    binary: 'forge',
    args: ['test', '--match-test', 'Mutation', '--gas-report'],
    timeoutMs: PROCESS_CONFIG.mutateTimeoutMs,
    correlationId,
    context: `mutation-tests`,
    env: { FOUNDRY_PROFILE: 'audit' },
  });
}

/**
 * Analyse l'AST via un script Node
 */
export async function analyzeAST(astJson, correlationId) {
  return executeCommand({
    binary: 'node',
    args: ['scripts/analyze-ast.mjs', '--stdin'],
    timeoutMs: PROCESS_CONFIG.analyzeTimeoutMs,
    maxBuffer: 5 * 1024 * 1024, // 5 Mo pour l'AST
    correlationId,
    context: `ast-analysis`,
    env: { AST_INPUT: astJson },
  });
}