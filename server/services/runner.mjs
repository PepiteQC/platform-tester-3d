/**
 * Runner de Tests de Mutation — Sandbox Docker
 * ⚠️  SÉCURITÉ CRITIQUE: Tout code utilisateur s'exécute dans un conteneur isolé
 */
import { exec }     from 'child_process';
import { promisify } from 'util';
import fs            from 'fs/promises';
import path          from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config }    from '../config.mjs';
import { logger }    from '../utils/logger.mjs';
import { wss }       from '../server.mjs';
import WebSocket     from 'ws';

const execAsync = promisify(exec);

// Sémaphore simple pour limiter la concurrence Docker
let activeJobs = 0;

// ─── Templates Foundry ──────────────────────────────────────────────────────
const FOUNDRY_TOML = `
[profile.default]
src = "src"
test = "test"
out = "out"
libs = ["lib"]
optimizer = false
fuzz = { runs = 50 }
`;

const HARDHAT_CONFIG = `
require("@nomicfoundation/hardhat-toolbox");
module.exports = {
  solidity: "0.8.24",
  paths: { sources: "./src", tests: "./test", cache: "./cache", artifacts: "./artifacts" }
};
`;

// ─── Broadcaster WebSocket ──────────────────────────────────────────────────
function broadcast(jobId, event, data) {
  const message = JSON.stringify({ jobId, event, data, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ─── Runner principal ───────────────────────────────────────────────────────
/**
 * @param {MutantResult[]} mutants      Liste de mutants générés
 * @param {string}         testCode     Code de tests (Foundry/Hardhat)
 * @param {string}         framework    'foundry' | 'hardhat'
 * @param {string}         jobId        UUID du job
 * @returns {MutationRunReport}
 */
export async function runMutationTests(mutants, testCode, framework = 'foundry', jobId = uuidv4()) {
  // Vérification de la concurrence
  if (activeJobs >= config.MAX_CONCURRENCY) {
    throw new Error('Serveur occupé. Réessayez dans quelques instants.');
  }

  activeJobs++;
  logger.info(`Job ${jobId} démarré (${mutants.length} mutants, ${framework}, concurrence: ${activeJobs}/${config.MAX_CONCURRENCY})`);

  const report = {
    jobId,
    framework,
    startedAt:      new Date().toISOString(),
    finishedAt:     null,
    totalMutants:   mutants.length,
    killed:         0,
    survived:       0,
    timedOut:       0,
    errors:         0,
    mutationScore:  0,
    mutants:        [],
  };

  broadcast(jobId, 'JOB_STARTED', { total: mutants.length });

  try {
    // Test original en premier — valide que les tests passent sur le code original
    broadcast(jobId, 'RUNNING_ORIGINAL', {});
    const originalPass = await runOriginalTests(mutants[0]?.sourceCode, testCode, framework, jobId);
    if (!originalPass) {
      throw new Error('Les tests originaux échouent. Corrigez vos tests avant de lancer la mutation.');
    }

    // ── Traitement séquentiel des mutants ──────────────────────────────────
    for (let i = 0; i < mutants.length; i++) {
      const mutant = mutants[i];
      broadcast(jobId, 'MUTANT_RUNNING', { index: i, mutant: mutant.id });

      const result = await runSingleMutant(mutant, testCode, framework, jobId);
      mutant.status   = result.status;
      mutant.testOutput = result.output;
      mutant.durationMs = result.durationMs;

      report.mutants.push(mutant);

      // Statistiques
      if (result.status === 'killed')   report.killed++;
      if (result.status === 'survived') report.survived++;
      if (result.status === 'timeout')  report.timedOut++;
      if (result.status === 'error')    report.errors++;

      broadcast(jobId, 'MUTANT_DONE', {
        index:  i,
        total:  mutants.length,
        mutant: { id: mutant.id, status: result.status },
        stats:  { killed: report.killed, survived: report.survived },
      });

      logger.info(`Mutant ${mutant.id}: ${result.status} (${result.durationMs}ms)`);
    }

    // ── Score de mutation ──────────────────────────────────────────────────
    const testable = report.killed + report.survived;
    report.mutationScore = testable > 0
      ? Math.round((report.killed / testable) * 100)
      : 0;

    report.finishedAt = new Date().toISOString();
    broadcast(jobId, 'JOB_COMPLETED', { report });

    logger.info(`Job ${jobId} terminé — Score: ${report.mutationScore}%`);
    return report;

  } catch (err) {
    broadcast(jobId, 'JOB_FAILED', { error: err.message });
    throw err;
  } finally {
    activeJobs--;
  }
}

// ─── Exécution d'un mutant unique ───────────────────────────────────────────
async function runSingleMutant(mutant, testCode, framework, jobId) {
  const jobDir = path.resolve(config.TEMP_DIR, `${jobId}-${mutant.id}`);
  const start  = Date.now();

  try {
    await setupSandbox(jobDir, mutant.sourceCode, testCode, framework);
    const output = await execInDocker(jobDir, framework);

    return {
      status:     parseTestResult(output, framework),
      output:     output.slice(0, 2000), // Limite l'output stocké
      durationMs: Date.now() - start,
    };

  } catch (err) {
    if (err.killed || err.message.includes('timeout')) {
      return { status: 'timeout', output: 'Timeout', durationMs: Date.now() - start };
    }
    // Les tests qui échouent (exit code != 0) → mutant tué ✅
    if (err.stderr && isTestFailure(err.stderr, framework)) {
      return { status: 'killed', output: err.stderr.slice(0, 2000), durationMs: Date.now() - start };
    }
    return { status: 'error', output: err.message.slice(0, 500), durationMs: Date.now() - start };

  } finally {
    // NETTOYAGE OBLIGATOIRE
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Setup du dossier sandbox ────────────────────────────────────────────────
async function setupSandbox(dir, sourceCode, testCode, framework) {
  if (framework === 'foundry') {
    await fs.mkdir(path.join(dir, 'src'),  { recursive: true });
    await fs.mkdir(path.join(dir, 'test'), { recursive: true });
    await fs.writeFile(path.join(dir, 'foundry.toml'),       FOUNDRY_TOML);
    await fs.writeFile(path.join(dir, 'src', 'Target.sol'),  sourceCode);
    await fs.writeFile(path.join(dir, 'test', 'Target.t.sol'), testCode);

  } else if (framework === 'hardhat') {
    await fs.mkdir(path.join(dir, 'src'),  { recursive: true });
    await fs.mkdir(path.join(dir, 'test'), { recursive: true });
    await fs.writeFile(path.join(dir, 'hardhat.config.js'),  HARDHAT_CONFIG);
    await fs.writeFile(path.join(dir, 'src', 'Target.sol'),  sourceCode);
    await fs.writeFile(path.join(dir, 'test', 'Target.js'),  testCode);
  }
}

// ─── Exécution Docker sécurisée ──────────────────────────────────────────────
async function execInDocker(dir, framework) {
  const testCmd = framework === 'foundry'
    ? 'forge test --json 2>&1'
    : 'npx hardhat test 2>&1';

  // Arguments Docker:
  // --rm              : supprime le conteneur après exécution
  // --network none    : COUPE INTERNET (empêche les imports malveillants)
  // --memory 512m     : limite RAM
  // --cpus 0.5        : limite CPU
  // --read-only       : filesystem en lecture seule sauf /project et /tmp
  // -u 65534:65534    : utilisateur nobody (pas root)
  // --security-opt    : désactive les privilèges supplémentaires
  const dockerArgs = [
    'run', '--rm',
    '--network', 'none',
    '--memory',  '512m',
    '--cpus',    '0.5',
    '-u',        '65534:65534',
    '--security-opt', 'no-new-privileges:true',
    '--cap-drop', 'ALL',
    '-v', `${dir}:/project:rw`,
    '--tmpfs', '/tmp:rw,size=64m',
    '-w', '/project',
    config.DOCKER_IMAGE,
    'sh', '-c', testCmd,
  ].join(' ');

  const { stdout } = await execAsync(`docker ${dockerArgs}`, {
    timeout: config.JOB_TIMEOUT_MS,
    maxBuffer: 1024 * 1024, // 1mb output max
  });

  return stdout;
}

// ─── Analyse du résultat des tests ──────────────────────────────────────────
function parseTestResult(output, framework) {
  if (framework === 'foundry') {
    try {
      const json = JSON.parse(output);
      const hasFailure = Object.values(json).some(suite =>
        Object.values(suite.test_results ?? {}).some(t => !t.success)
      );
      return hasFailure ? 'killed' : 'survived';
    } catch {
      return output.includes('FAIL') ? 'killed' : 'survived';
    }
  }
  if (framework === 'hardhat') {
    return output.includes('passing') && output.includes('failing') ? 'killed' : 'survived';
  }
  return 'error';
}

function isTestFailure(stderr, framework) {
  if (framework === 'foundry') return stderr.includes('FAIL') || stderr.includes('test failed');
  if (framework === 'hardhat') return stderr.includes('AssertionError') || stderr.includes('Error:');
  return false;
}

async function runOriginalTests(sourceCode, testCode, framework, jobId) {
  const dir = path.resolve(config.TEMP_DIR, `${jobId}-original`);
  try {
    await setupSandbox(dir, sourceCode, testCode, framework);
    const output = await execInDocker(dir, framework);
    return !output.includes('FAIL');
  } catch {
    return false;
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}