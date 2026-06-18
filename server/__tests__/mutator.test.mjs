import { describe, it, expect } from 'vitest';
import { generateMutants }      from '../services/mutator.mjs';

// ─── Fixtures Solidity ────────────────────────────────────────────────────────
const SIMPLE_CONTRACT = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleToken {
    uint256 public totalSupply;
    mapping(address => uint256) public balances;

    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Zero address");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    function isAllowed(uint256 value) public pure returns (bool) {
        return value > 100 && value <= 1000;
    }

    function hasFlag() public pure returns (bool) {
        return true;
    }
}
`;

describe('Opérateur BCR (Boundary Condition)', () => {
  it('devrait générer des mutants pour > et <=', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BCR'], 50);
    expect(mutants.length).toBeGreaterThan(0);
    expect(mutants.every(m => m.operator === 'BCR')).toBe(true);
  });

  it('les mutants BCR doivent remplacer > par >=', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BCR'], 50);
    const gtMutant = mutants.find(m => m.original === '>');
    expect(gtMutant).toBeDefined();
    expect(gtMutant.mutated).toBe('>=');
    expect(gtMutant.sourceCode).toContain('>=');
  });

  it('les mutants BCR doivent remplacer <= par <', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BCR'], 50);
    const lteMutant = mutants.find(m => m.original === '<=');
    expect(lteMutant).toBeDefined();
    expect(lteMutant.mutated).toBe('<');
  });
});

describe('Opérateur BLR (Boolean Literal)', () => {
  it('devrait générer un mutant qui remplace true par false', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BLR'], 10);
    expect(mutants.length).toBeGreaterThan(0);
    const blrMutant = mutants[0];
    expect(blrMutant.original).toBe('true');
    expect(blrMutant.mutated).toBe('false');
    expect(blrMutant.sourceCode).not.toContain('return true;');
  });
});

describe('Opérateur RQD (Require Deletion)', () => {
  it('devrait neutraliser la condition du require', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['RQD'], 10);
    expect(mutants.length).toBeGreaterThan(0);
    mutants.forEach(m => {
      expect(m.mutated).toBe('true');
      expect(m.sourceCode).toContain('require(true');
    });
  });
});

describe('Opérateur AOR (Arithmetic)', () => {
  it('devrait remplacer += par -=', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['AOR'], 20);
    expect(mutants.some(m => m.original === '+' || m.original === '-')).toBe(true);
  });
});

describe('generateMutants — Comportement général', () => {
  it('devrait respecter le maxMutants', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BCR', 'AOR', 'BLR', 'RQD'], 3);
    expect(mutants.length).toBeLessThanOrEqual(3);
  });

  it('chaque mutant doit avoir un ID unique', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BCR', 'AOR', 'BLR'], 50);
    const ids = mutants.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque mutant doit avoir un sourceCode différent de l\'original', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BCR', 'AOR', 'BLR', 'RQD'], 50);
    mutants.forEach(m => {
      expect(m.sourceCode).not.toBe(SIMPLE_CONTRACT);
    });
  });

  it('devrait retourner tableau vide pour opérateur inconnu', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['INVALID_OP'], 10);
    expect(mutants).toEqual([]);
  });
});