/**
 * Analyse de l'AST Solidity
 * Extrait les contrats, fonctions, events, modifiers, variables d'état
 */
import { parse, visit } from '@solidity-parser/parser';
import { logger } from '../utils/logger.mjs';

/**
 * @param {string} sourceCode
 * @returns {ASTAnalysis}
 */
export function analyzeAST(sourceCode) {
  let ast;
  try {
    ast = parse(sourceCode, {
      loc:       true,
      range:     true,
      tolerant:  true, // Continue malgré des erreurs mineures
    });
  } catch (err) {
    throw new Error(`Parse AST échoué: ${err.message}`);
  }

  const analysis = {
    contracts:       [],
    totalFunctions:  0,
    totalEvents:     0,
    totalModifiers:  0,
    pragmas:         [],
    imports:         [],
    mutationTargets: [], // Points d'intérêt pour la mutation
  };

  // ── Visite de l'AST ───────────────────────────────────────────────────────
  visit(ast, {

    PragmaDirective(node) {
      analysis.pragmas.push({
        name:  node.name,
        value: node.value,
      });
    },

    ImportDirective(node) {
      analysis.imports.push(node.path);
    },

    ContractDefinition(node) {
      const contract = {
        name:          node.name,
        kind:          node.kind, // contract | interface | library
        baseContracts: node.baseContracts.map(b => b.baseName.namePath),
        functions:     [],
        events:        [],
        modifiers:     [],
        stateVars:     [],
        loc:           node.loc,
      };

      // Fonctions
      node.subNodes
        .filter(n => n.type === 'FunctionDefinition')
        .forEach(fn => {
          const funcInfo = {
            name:        fn.name || (fn.isConstructor ? '<constructor>' : '<fallback>'),
            visibility:  fn.visibility ?? 'default',
            mutability:  fn.stateMutability ?? 'nonpayable',
            isConstructor: fn.isConstructor ?? false,
            parameters:  (fn.parameters?.parameters ?? []).map(p => ({
              name: p.name,
              type: p.typeName?.name ?? typeToString(p.typeName),
            })),
            returns:     (fn.returnParameters?.parameters ?? []).map(r => ({
              name: r.name,
              type: r.typeName?.name ?? typeToString(r.typeName),
            })),
            modifiers:   (fn.modifiers ?? []).map(m => m.name),
            loc:         fn.loc,
            hasRequire:  false,
            hasAssert:   false,
            operators:   [], // Opérateurs trouvés (pour scoring mutation)
          };

          // Analyse interne du corps de la fonction
          if (fn.body) {
            visit({ type: 'SourceUnit', children: [fn.body] }, {
              FunctionCall(callNode) {
                const callee = callNode.expression?.name;
                if (callee === 'require') funcInfo.hasRequire = true;
                if (callee === 'assert')  funcInfo.hasAssert  = true;
              },
              BinaryOperation(binNode) {
                funcInfo.operators.push({
                  op:  binNode.operator,
                  loc: binNode.loc,
                });
                // Cible de mutation potentielle
                if (['<', '>', '<=', '>=', '==', '!=', '+', '-', '*', '/'].includes(binNode.operator)) {
                  analysis.mutationTargets.push({
                    contract:  contract.name,
                    function:  funcInfo.name,
                    operator:  binNode.operator,
                    loc:       binNode.loc,
                    type:      binNode.operator.match(/[<>=!]/) ? 'BCR' : 'AOR',
                  });
                }
              },
            });
          }

          contract.functions.push(funcInfo);
          analysis.totalFunctions++;
        });

      // Events
      node.subNodes
        .filter(n => n.type === 'EventDefinition')
        .forEach(ev => {
          contract.events.push({
            name:       ev.name,
            parameters: (ev.parameters?.parameters ?? []).map(p => ({
              name:    p.name,
              type:    p.typeName?.name ?? 'unknown',
              indexed: p.isIndexed ?? false,
            })),
            loc: ev.loc,
          });
          analysis.totalEvents++;
        });

      // Modifiers
      node.subNodes
        .filter(n => n.type === 'ModifierDefinition')
        .forEach(mod => {
          contract.modifiers.push({ name: mod.name, loc: mod.loc });
          analysis.totalModifiers++;
          // Un modifier = cible de mutation RQD potentielle
          analysis.mutationTargets.push({
            contract: contract.name,
            type: 'VCR',
            name: mod.name,
            loc:  mod.loc,
          });
        });

      // Variables d'état
      node.subNodes
        .filter(n => n.type === 'StateVariableDeclaration')
        .forEach(sv => {
          sv.variables.forEach(v => {
            contract.stateVars.push({
              name:       v.name,
              type:       v.typeName?.name ?? typeToString(v.typeName),
              visibility: v.visibility ?? 'internal',
              isConstant: v.isDeclaredConst ?? false,
              loc:        v.loc,
            });
          });
        });

      analysis.contracts.push(contract);
    },
  });

  logger.info(`Analyse AST: ${analysis.contracts.length} contrat(s), ${analysis.totalFunctions} fonction(s), ${analysis.mutationTargets.length} cible(s) de mutation`);

  return analysis;
}

// ─── Helper ─────────────────────────────────────────────────────────────────
function typeToString(typeName) {
  if (!typeName) return 'unknown';
  if (typeName.type === 'ArrayTypeName')    return `${typeToString(typeName.baseTypeName)}[]`;
  if (typeName.type === 'Mapping')          return `mapping(${typeToString(typeName.keyType)} => ${typeToString(typeName.valueType)})`;
  if (typeName.type === 'UserDefinedTypeName') return typeName.namePath;
  return typeName.name ?? 'unknown';
}