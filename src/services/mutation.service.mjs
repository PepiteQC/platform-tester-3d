import parser from '@solidity-parser/parser';
import crypto from 'node:crypto';

/**
 * Génère des mutants à partir d'un code Solidity en appliquant 
 * des opérateurs de mutation sur l'AST puis en régénérant le source.
 */
export function generateMutants({ sourceCode, fileName, operators, maxMutants }) {
  const startedAt = performance.now();

  let ast;
  try {
    ast = parser.parse(sourceCode, { loc: true, range: true });
  } catch (error) {
    return {
      success: false,
      error: 'PARSER_ERROR',
      message: error.message,
    };
  }

  // Collecte de tous les points de mutation possibles
  const mutationPoints = collectMutationPoints(ast, operators);

  // Génération des mutants (limités à maxMutants)
  const selectedPoints = mutationPoints.slice(0, maxMutants);
  const mutants = selectedPoints.map((point, index) =>
    applyMutation(sourceCode, point, index, fileName)
  );

  return {
    success: true,
    durationMs: Math.round(performance.now() - startedAt),
    totalCandidates: mutationPoints.length,
    generatedCount: mutants.length,
    operatorsUsed: operators,
    mutants,
  };
}

// ═══════════════════════════════════════════════════════════════
//  COLLECTE DES POINTS DE MUTATION
// ═══════════════════════════════════════════════════════════════

function collectMutationPoints(ast, operators) {
  const points = [];

  parser.visit(ast, {
    // AOR : a + b → a - b, a * b → a / b, etc.
    BinaryOperation(node) {
      if (!node.range) return;

      if (operators.includes('AOR') && ARITHMETIC_OPS[node.operator]) {
        for (const replacement of ARITHMETIC_OPS[node.operator]) {
          points.push({
            operator: 'AOR',
            description: `Replace "${node.operator}" with "${replacement}"`,
            originalOperator: node.operator,
            newOperator: replacement,
            range: node.range,
            loc: node.loc,
            line: node.loc?.start?.line,
          });
        }
      }

      // BLR : && → ||, || → &&
      if (operators.includes('BLR') && BOOLEAN_OPS[node.operator]) {
        for (const replacement of BOOLEAN_OPS[node.operator]) {
          points.push({
            operator: 'BLR',
            description: `Replace "${node.operator}" with "${replacement}"`,
            originalOperator: node.operator,
            newOperator: replacement,
            range: node.range,
            loc: node.loc,
            line: node.loc?.start?.line,
          });
        }
      }
    },

    // BCR : true → false, false → true
    BooleanLiteral(node) {
      if (!node.range) return;

      if (operators.includes('BCR')) {
        const newValue = node.value ? 'false' : 'true';
        points.push({
          operator: 'BCR',
          description: `Replace "${node.value}" with "${newValue}"`,
          originalValue: String(node.value),
          newValue,
          range: node.range,
          loc: node.loc,
          line: node.loc?.start?.line,
        });
      }
    },

    // RQD : Suppression de require()
    FunctionCall(node) {
      if (!node.range) return;

      const isRequire =
        node.expression?.type === 'Identifier' &&
        node.expression?.name === 'require';

      if (operators.includes('RQD') && isRequire) {
        points.push({
          operator: 'RQD',
          description: 'Remove require() statement',
          range: node.range,
          loc: node.loc,
          line: node.loc?.start?.line,
        });
      }
    },
  });

  return points;
}

// ═══════════════════════════════════════════════════════════════
//  APPLICATION D'UNE MUTATION
// ═══════════════════════════════════════════════════════════════

function applyMutation(sourceCode, point, index, fileName) {
  const [start, end] = point.range;
  const originalSegment = sourceCode.substring(start, end + 1);
  let mutatedSegment = originalSegment;

  switch (point.operator) {
    case 'AOR':
    case 'BLR':
      // Remplace le premier opérateur trouvé
      mutatedSegment = originalSegment.replace(
        point.originalOperator,
        point.newOperator
      );
      break;

    case 'BCR':
      mutatedSegment = originalSegment.replace(
        point.originalValue,
        point.newValue
      );
      break;

    case 'RQD':
      // Commente la ligne require()
      mutatedSegment = `/* MUTANT: require removed */`;
      break;
  }

  const mutatedSource =
    sourceCode.substring(0, start) +
    mutatedSegment +
    sourceCode.substring(end + 1);

  const mutantId = `M${String(index + 1).padStart(4, '0')}`;
  const hash = crypto
    .createHash('sha256')
    .update(mutatedSource)
    .digest('hex')
    .slice(0, 12);

  return {
    id: mutantId,
    hash,
    operator: point.operator,
    description: point.description,
    line: point.line,
    diff: {
      original: originalSegment,
      mutated: mutatedSegment,
    },
    fileName: `${mutantId}_${fileName}`,
    mutatedSource,
  };
}

// ═══════════════════════════════════════════════════════════════
//  TABLES DE MUTATION
// ═══════════════════════════════════════════════════════════════

const ARITHMETIC_OPS = {
  '+': ['-', '*'],
  '-': ['+', '*'],
  '*': ['/', '+'],
  '/': ['*', '%'],
  '%': ['*', '/'],
  '**': ['*'],
};

const BOOLEAN_OPS = {
  '&&': ['||'],
  '||': ['&&'],
  '==': ['!='],
  '!=': ['=='],
  '<': ['<=', '>'],
  '>': ['>=', '<'],
  '<=': ['<', '>='],
  '>=': ['>', '<='],
};