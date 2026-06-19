import solc from 'solc';
import parser from '@solidity-parser/parser';

export function compileSolidity({ sourceCode, fileName }) {
  const input = {
    language: 'Solidity',
    sources: {
      [fileName]: {
        content: sourceCode,
      },
    },
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'],
          '': ['ast'],
        },
      },
    },
  };

  const rawOutput = solc.compile(JSON.stringify(input));
  const output = JSON.parse(rawOutput);

  const errors = output.errors || [];
  const fatalErrors = errors.filter((err) => err.severity === 'error');
  const warnings = errors.filter((err) => err.severity === 'warning');

  if (fatalErrors.length > 0) {
    return {
      success: false,
      compilerVersion: solc.version(),
      errors: fatalErrors.map(normalizeSolcError),
      warnings: warnings.map(normalizeSolcError),
    };
  }

  const contracts = output.contracts?.[fileName] || {};
  const ast = output.sources?.[fileName]?.ast || null;

  const normalizedContracts = Object.entries(contracts).map(([name, data]) => ({
    name,
    abi: data.abi || [],
    bytecode: data.evm?.bytecode?.object || '',
    deployedBytecode: data.evm?.deployedBytecode?.object || '',
    bytecodeSize: Math.ceil((data.evm?.bytecode?.object || '').length / 2),
  }));

  return {
    success: true,
    compilerVersion: solc.version(),
    contracts: normalizedContracts,
    ast,
    warnings: warnings.map(normalizeSolcError),
  };
}

export function analyzeSoliditySource({ sourceCode }) {
  let ast;

  try {
    ast = parser.parse(sourceCode, {
      loc: true,
      range: true,
      tolerant: true,
    });
  } catch (error) {
    return {
      success: false,
      error: 'PARSER_ERROR',
      message: error.message,
    };
  }

  const result = {
    success: true,
    contracts: [],
    functions: [],
    events: [],
    modifiers: [],
    stateVariables: [],
    imports: [],
    pragmas: [],
    metrics: {
      contractCount: 0,
      functionCount: 0,
      eventCount: 0,
      modifierCount: 0,
      stateVariableCount: 0,
      importCount: 0,
      pragmaCount: 0,
    },
  };

  parser.visit(ast, {
    PragmaDirective(node) {
      result.pragmas.push({
        name: node.name,
        value: node.value,
        loc: node.loc,
      });
    },

    ImportDirective(node) {
      result.imports.push({
        path: node.path,
        unitAlias: node.unitAlias || null,
        loc: node.loc,
      });
    },

    ContractDefinition(node) {
      result.contracts.push({
        name: node.name,
        kind: node.kind,
        baseContracts: node.baseContracts?.map((base) => base.baseName?.namePath) || [],
        loc: node.loc,
      });
    },

    FunctionDefinition(node) {
      result.functions.push({
        name: node.name || '(fallback/receive/constructor)',
        visibility: node.visibility || 'default',
        stateMutability: node.stateMutability || null,
        isConstructor: Boolean(node.isConstructor),
        modifiers: node.modifiers?.map((m) => m.name) || [],
        parameters: node.parameters?.map((p) => ({
          name: p.name || null,
          type: p.typeName?.name || p.typeName?.type || null,
        })) || [],
        loc: node.loc,
      });
    },

    EventDefinition(node) {
      result.events.push({
        name: node.name,
        parameters: node.parameters?.map((p) => ({
          name: p.name || null,
          type: p.typeName?.name || p.typeName?.type || null,
          indexed: Boolean(p.isIndexed),
        })) || [],
        loc: node.loc,
      });
    },

    ModifierDefinition(node) {
      result.modifiers.push({
        name: node.name,
        loc: node.loc,
      });
    },

    StateVariableDeclaration(node) {
      for (const variable of node.variables || []) {
        result.stateVariables.push({
          name: variable.name,
          visibility: variable.visibility || 'default',
          isDeclaredConst: Boolean(variable.isDeclaredConst),
          isImmutable: Boolean(variable.isImmutable),
          type: variable.typeName?.name || variable.typeName?.type || null,
          loc: variable.loc,
        });
      }
    },
  });

  result.metrics.contractCount = result.contracts.length;
  result.metrics.functionCount = result.functions.length;
  result.metrics.eventCount = result.events.length;
  result.metrics.modifierCount = result.modifiers.length;
  result.metrics.stateVariableCount = result.stateVariables.length;
  result.metrics.importCount = result.imports.length;
  result.metrics.pragmaCount = result.pragmas.length;

  return result;
}

function normalizeSolcError(error) {
  return {
    severity: error.severity,
    type: error.type,
    component: error.component,
    message: error.message,
    formattedMessage: error.formattedMessage,
    sourceLocation: error.sourceLocation || null,
  };
}