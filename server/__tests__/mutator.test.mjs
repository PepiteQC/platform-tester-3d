import { describe, it, expect } from 'vitest'
import { generateMutants, OPERATORS } from '../services/mutator.mjs'

const SIMPLE_CONTRACT = `
pragma solidity ^0.8.0;

contract SimpleToken {
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    constructor(uint256 _supply) {
        totalSupply = _supply;
        balanceOf[msg.sender] = _supply;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Invalid recipient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function isValid(uint256 value) public pure returns (bool) {
        return value > 0 && value < 1000;
    }
}
`

describe('OPERATORS', () => {
  it('exporte les 5 opérateurs requis', () => {
    expect(Object.keys(OPERATORS)).toEqual(
      expect.arrayContaining(['BCR', 'AOR', 'BLR', 'RQD', 'VCR'])
    )
  })

  it('chaque opérateur a name et description', () => {
    for (const [key, op] of Object.entries(OPERATORS)) {
      expect(op.name,        `${key}.name`).toBeTruthy()
      expect(op.description, `${key}.description`).toBeTruthy()
    }
  })
})

describe('generateMutants — BCR', () => {
  it('génère des mutants pour les opérateurs de comparaison', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BCR'], 50)
    expect(mutants.length).toBeGreaterThan(0)

    mutants.forEach(m => {
      expect(m.operator).toBe('BCR')
      expect(m.id).toMatch(/^BCR_/)
      expect(m.sourceCode).toBeTruthy()
      expect(m.status).toBe('pending')
      expect(m.location).toHaveProperty('line')
    })
  })

  it('le code muté diffère du code original', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BCR'], 5)
    mutants.forEach(m => {
      expect(m.sourceCode).not.toBe(SIMPLE_CONTRACT)
    })
  })
})

describe('generateMutants — AOR', () => {
  it('génère des mutants arithmétiques', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['AOR'], 50)
    expect(mutants.length).toBeGreaterThan(0)
    mutants.forEach(m => {
      expect(m.operator).toBe('AOR')
    })
  })
})

describe('generateMutants — RQD', () => {
  it('neutralise les require()', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['RQD'], 50)
    expect(mutants.length).toBeGreaterThan(0)

    mutants.forEach(m => {
      expect(m.operator).toBe('RQD')
      expect(m.mutated).toBe('true')
      expect(m.sourceCode).toContain('require(true')
    })
  })
})

describe('generateMutants — VCR', () => {
  it('change la visibilité des fonctions', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['VCR'], 50)
    expect(mutants.length).toBeGreaterThan(0)

    mutants.forEach(m => {
      expect(m.operator).toBe('VCR')
      expect(['public', 'external']).toContain(m.original)
      expect(m.mutated).toBe('internal')
    })
  })
})

describe('generateMutants — maxMutants', () => {
  it('respecte la limite maxMutants', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['BCR', 'AOR', 'RQD', 'VCR'], 5)
    expect(mutants.length).toBeLessThanOrEqual(5)
  })

  it('retourne un tableau vide pour un opérateur inconnu', () => {
    const mutants = generateMutants(SIMPLE_CONTRACT, ['UNKNOWN'], 10)
    expect(mutants).toEqual([])
  })
})

describe('generateMutants — tous les opérateurs ensemble', () => {
  it('combine les 5 opérateurs sans erreur', () => {
    const mutants = generateMutants(
      SIMPLE_CONTRACT,
      ['BCR', 'AOR', 'BLR', 'RQD', 'VCR'],
      100
    )
    expect(mutants.length).toBeGreaterThan(0)

    const operators = new Set(mutants.map(m => m.operator))
    expect(operators.size).toBeGreaterThan(1)
  })
})