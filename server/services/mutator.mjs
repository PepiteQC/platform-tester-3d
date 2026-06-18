/**
 * Moteur de Mutation Solidity
 * 5 opérateurs sûrs avec localisation précise par AST
 */
import { parse, visit } from '@solidity-parser/parser';
import { logger } from '../utils/logger.mjs';

// ─── Définition des opérateurs ──────────────────────────────────────────────

export const OPERATORS = {

  /**
   * BCR — Boundary Condition Replacement
   * < → <=, > → >=, <= → <, >= → >
   */
  BCR: {
    name:        'Boundary Condition Replacement',
    description: 'Modifie les conditions limites des comparaisons',
    map: { '<': '<=', '>': '>=', '<=': '<', '>=': '>' },
  },

  /**
   * AOR — Arithmetic Operator Replacement
   * + → -, - → +, * → /, / → *
   */
  AOR: {
    name:        'Arithmetic Operator Replacement',
    description: 'Remplace les opérateurs arithmétiques',
    map: { '+': '-', '-': '+', '*': '/', '/': '*' },
  },

  /**
   * BLR — Boolean Literal Replacement
   * true → false, false → true
   */
  BLR: {
    name:        'Boolean Literal Replacement',
    description: 'Inverse les littéraux booléens',
  },

  /**
   * RQD — Require/Assert Deletion
   * Supprime la condition d'un require (la remplace par require(true))
   */
  RQD: {
    name:        'Require/Assert Deletion',
    description: 'Supprime les gardes de validation',
  },

  /**
   * VCR — Visibility Change Replacement
   * public → internal, external → internal
   */
  VCR: {
    name:        'Visibility Change Replacement',
    description: 'Change la visibilité des fonctions',
    map: { 'public': 'internal', 'external': 'internal' },
  },
};

// ─── Moteur principal ───────────────────────────────────────────────────────

/**
 * @param {string}   sourceCode  Code Solidity original
 * @param {string[]} operators   Liste d'opérateurs à appliquer
 * @param {number}   maxMutants  Nombre max de mutants à générer
 * @returns {MutantResult[]}
 */
export function generateMutants(sourceCode, operators = ['BCR', 'AOR', 'BLR'], maxMutants = 20) {
  const mutants = [];

  for (const opKey of operators) {
    if (!OPERATORS[opKey]) continue;

    const generated = applyOperator(sourceCode, opKey);
    mutants.push(...generated);

    if (mutants.length >= maxMutants) break;
  }

  const result = mutants.slice(0, maxMutants);
  logger.info(`Mutants générés: ${result.length} (opérateurs: ${operators.join(', ')})`);
  return result;
}

// ─── Opérateur BCR ──────────────────────────────────────────────────────────
function applyBCR(sourceCode) {
  const mutants  = [];
  const { map }  = OPERATORS.BCR;

  parse(sourceCode, { loc: true, range: true });

  const ast = parse(sourceCode, { loc: true, range: true, tolerant: true });

  visit(ast, {
    BinaryOperation(node) {
      const replacement = map[node.operator];
      if (!replacement) return;

      const mutated = replaceInSource(
        sourceCode,
        node.range[0] + sourceCode.slice(node.range[0]).indexOf(node.operator),
        node.operator.length,
        replacement
      );

      mutants.push({
        id:          `BCR_${node.loc.start.line}_${node.loc.start.column}`,
        operator:    'BCR',
        description: `Ligne ${node.loc.start.line}: '${node.operator}' → '${replacement}'`,
        original:    node.operator,
        mutated:     replacement,
        location:    { line: node.loc.start.line, col: node.loc.start.column },
        sourceCode:  mutated,
        status:      'pending',
      });
    }
  });

  return mutants;
}

// ─── Opérateur AOR ──────────────────────────────────────────────────────────
function applyAOR(sourceCode) {
  const mutants = [];
  const { map } = OPERATORS.AOR;

  const ast = parse(sourceCode, { loc: true, range: true, tolerant: true });

  visit(ast, {
    BinaryOperation(node) {
      const replacement = map[node.operator];
      if (!replacement) return;

      // Évite de muter des divisions par zéro évidentes
      if (replacement === '/' && node.right?.number === '0') return;

      const opOffset = findOperatorOffset(sourceCode, node);
      if (opOffset === -1) return;

      const mutated = replaceInSource(sourceCode, opOffset, node.operator.length, replacement);

      mutants.push({
        id:          `AOR_${node.loc.start.line}_${node.loc.start.column}`,
        operator:    'AOR',
        description: `Ligne ${node.loc.start.line}: '${node.operator}' → '${replacement}'`,
        original:    node.operator,
        mutated:     replacement,
        location:    { line: node.loc.start.line, col: node.loc.start.column },
        sourceCode:  mutated,
        status:      'pending',
      });
    }
  });

  return mutants;
}

// ─── Opérateur BLR ──────────────────────────────────────────────────────────
function applyBLR(sourceCode) {
  const mutants = [];
  const ast = parse(sourceCode, { loc: true, range: true, tolerant: true });

  visit(ast, {
    BooleanLiteral(node) {
      const replacement = node.value ? 'false' : 'true';
      const mutated     = replaceInSource(
        sourceCode,
        node.range[0],
        node.range[1] - node.range[0],
        replacement
      );

      mutants.push({
        id:          `BLR_${node.loc.start.line}_${node.loc.start.column}`,
        operator:    'BLR',
        description: `Ligne ${node.loc.start.line}: '${node.value}' → '${replacement}'`,
        original:    String(node.value),
        mutated:     replacement,
        location:    { line: node.loc.start.line, col: node.loc.start.column },
        sourceCode:  mutated,
        status:      'pending',
      });
    }
  });

  return mutants;
}

// ─── Opérateur RQD ──────────────────────────────────────────────────────────
function applyRQD(sourceCode) {
  const mutants = [];
  const ast = parse(sourceCode, { loc: true, range: true, tolerant: true });

  visit(ast, {
    ExpressionStatement(node) {
      const expr = node.expression;
      if (expr?.type !== 'FunctionCall') return;

      const callee = expr.expression?.name;
      if (callee !== 'require' && callee !== 'assert') return;

      // Remplace require(cond, "msg") par require(true, "msg")
      const args = expr.arguments;
      if (!args || args.length === 0) return;

      const firstArg = args[0];
      const mutated  = replaceInSource(
        sourceCode,
        firstArg.range[0],
        firstArg.range[1] - firstArg.range[0],
        'true'
      );

      mutants.push({
        id:          `RQD_${node.loc.start.line}`,
        operator:    'RQD',
        description: `Ligne ${node.loc.start.line}: condition de ${callee}() neutralisée`,
        original:    sourceCode.slice(firstArg.range[0], firstArg.range[1]),
        mutated:     'true',
        location:    { line: node.loc.start.line, col: node.loc.start.column },
        sourceCode:  mutated,
        status:      'pending',
      });
    }
  });

  return mutants;
}

// ─── Opérateur VCR ──────────────────────────────────────────────────────────
function applyVCR(sourceCode) {
  const mutants = [];
  const { map } = OPERATORS.VCR;
  const ast = parse(sourceCode, { loc: true, range: true, tolerant: true });

  visit(ast, {
    FunctionDefinition(node) {
      const replacement = map[node.visibility];
      if (!replacement || node.isConstructor) return;

      // Trouve l'offset exact du mot-clé de visibilité dans le source
      const funcStart = node.range[0];
      const funcSlice = sourceCode.slice(funcStart, funcStart + 200);
      const visOffset = funcSlice.indexOf(node.visibility);

      if (visOffset === -1) return;

      const mutated = replaceInSource(
        sourceCode,
        funcStart + visOffset,
        node.visibility.length,
        replacement
      );

      mutants.push({
        id:          `VCR_${node.loc.start.line}`,
        operator:    'VCR',
        description: `Ligne ${node.loc.start.line}: fonction '${node.name}' ${node.visibility} → ${replacement}`,
        original:    node.visibility,
        mutated:     replacement,
        location:    { line: node.loc.start.line, col: node.loc.start.column },
        sourceCode:  mutated,
        status:      'pending',
      });
    }
  });

  return mutants;
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────
function applyOperator(sourceCode, opKey) {
  switch (opKey) {
    case 'BCR': return applyBCR(sourceCode);
    case 'AOR': return applyAOR(sourceCode);
    case 'BLR': return applyBLR(sourceCode);
    case 'RQD': return applyRQD(sourceCode);
    case 'VCR': return applyVCR(sourceCode);
    default:    return [];
  }
}

// ─── Utilitaires de remplacement textuel ────────────────────────────────────

/**
 * Remplace un extrait du code source à un offset précis
 */
function replaceInSource(source, offset, length, replacement) {
  return source.slice(0, offset) + replacement + source.slice(offset + length);
}

/**
 * Trouve l'offset d'un opérateur binaire dans le code source
 * en cherchant entre les deux opérandes
 */
function findOperatorOffset(source, node) {
  // Cherche l'opérateur dans la zone entre les deux opérandes
  const searchStart = node.left.range[1];
  const searchEnd   = node.right.range[0];
  const zone        = source.slice(searchStart, searchEnd);
  const idx         = zone.indexOf(node.operator);
  return idx === -1 ? -1 : searchStart + idx;
}