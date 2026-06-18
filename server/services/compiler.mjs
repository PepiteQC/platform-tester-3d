/**
 * Compilateur Solidity via solc-js (Standard JSON)
 * Évite l'exécution de binaires externes non contrôlés
 */
import solc from 'solc';
import { logger } from '../utils/logger.mjs';

/**
 * @param {string} sourceCode  - Code Solidity brut
 * @param {string} fileName    - Ex: "MyToken.sol"
 * @returns {CompileResult}
 */
export async function compileSolidity(sourceCode, fileName) {
  logger.info(`Compilation: ${fileName}`);
  const start = Date.now();

  // ── Standard JSON Input ──────────────────────────────────────────────────
  const input = JSON.stringify({
    language: 'Solidity',
    sources: {
      [fileName]: { content: sourceCode }
    },
    settings: {
      optimizer: { enabled: false },
      outputSelection: {
        '*': {
          '*': [
            'abi',
            'evm.bytecode.object',
            'evm.deployedBytecode.object',
            'storageLayout',
          ],
          '': ['ast']  // AST au niveau fichier
        }
      }
    }
  });

  // ── Compilation synchrone (solc-js l'est nativement) ────────────────────
  let output;
  try {
    output = JSON.parse(solc.compile(input));
  } catch (err) {
    throw new CompilerError(`Erreur interne solc: ${err.message}`);
  }

  // ── Séparation erreurs / warnings ────────────────────────────────────────
  const errors   = [];
  const warnings = [];

  (output.errors || []).forEach(e => {
    const entry = {
      severity:   e.severity,
      message:    e.message,
      formatted:  e.formattedMessage,
      location:   e.sourceLocation ?? null,
    };
    if (e.severity === 'error')   errors.push(entry);
    if (e.severity === 'warning') warnings.push(entry);
  });

  if (errors.length > 0) {
    throw new CompilerError(
      `${errors.length} erreur(s) de compilation`,
      errors
    );
  }

  // ── Extraction des résultats ──────────────────────────────────────────────
  const ast       = output.sources?.[fileName]?.ast ?? null;
  const contracts = output.contracts?.[fileName]   ?? {};

  const compiled = Object.entries(contracts).map(([name, data]) => ({
    name,
    abi:              data.abi ?? [],
    bytecodeSize:     Math.floor((data.evm?.bytecode?.object?.length ?? 0) / 2),
    deployedBytecode: data.evm?.deployedBytecode?.object ?? '',
    storageLayout:    data.storageLayout ?? {},
  }));

  const elapsed = Date.now() - start;
  logger.info(`Compilation OK: ${fileName} (${elapsed}ms, ${compiled.length} contrat(s))`);

  return {
    success:   true,
    fileName,
    compiled,
    warnings,
    ast,
    compileTimeMs: elapsed,
  };
}

// ─── Erreur typée ──────────────────────────────────────────────────────────
export class CompilerError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name    = 'CompilerError';
    this.details = details;
    this.statusCode = 422; // Unprocessable Entity
  }
}