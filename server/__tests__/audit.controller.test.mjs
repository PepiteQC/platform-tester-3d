import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/compiler.mjs', () => ({
  compileSolidity: vi.fn(),
  CompilerError:   class CompilerError extends Error {
    constructor(msg, details = []) {
      super(msg)
      this.name       = 'CompilerError'
      this.details    = details
      this.statusCode = 422
    }
  },
}))

vi.mock('../services/ast-analyzer.mjs', () => ({
  analyzeAST: vi.fn(),
}))

vi.mock('../services/mutator.mjs', () => ({
  generateMutants: vi.fn(),
}))

vi.mock('../services/runner.mjs', () => ({
  runMutationTests: vi.fn(),
}))

vi.mock('../utils/logger.mjs', () => ({
  logger: {
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { compileSolidity, CompilerError } from '../services/compiler.mjs'
import { analyzeAST }                     from '../services/ast-analyzer.mjs'
import { generateMutants }                from '../services/mutator.mjs'
import { runMutationTests }               from '../services/runner.mjs'

import {
  handleCompile,
  handleAnalyze,
  handleMutate,
  handleRunMutation,
  handleGetReport,
} from '../controllers/audit.controller.mjs'

function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json   = vi.fn().mockReturnValue(res)
  return res
}

function mockReq(body = {}, params = {}) {
  return {
    validatedBody: body,
    params,
    ip: '127.0.0.1',
  }
}

describe('handleCompile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 200 avec le résultat de compilation', async () => {
    compileSolidity.mockResolvedValue({
      success:  true,
      fileName: 'Test.sol',
      compiled: [],
      warnings: [],
    })

    const req = mockReq({ sourceCode: 'pragma solidity ^0.8.0; contract T {}', fileName: 'Test.sol' })
    const res = mockRes()

    await handleCompile(req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('retourne 422 si CompilerError', async () => {
    compileSolidity.mockRejectedValue(
      new CompilerError('Erreur de compilation', [{ message: 'syntax error' }])
    )

    const req = mockReq({ sourceCode: 'bad code', fileName: 'Bad.sol' })
    const res = mockRes()

    await handleCompile(req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
  })
})

describe('handleAnalyze', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 200 avec l\'analyse AST', async () => {
    analyzeAST.mockReturnValue({
      contracts:      [{ name: 'Token' }],
      totalFunctions: 3,
      totalEvents:    1,
    })

    const req = mockReq({ sourceCode: 'pragma solidity ^0.8.0; contract Token {}' })
    const res = mockRes()

    await handleAnalyze(req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })
})

describe('handleMutate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les mutants générés', async () => {
    generateMutants.mockReturnValue([
      { id: 'BCR_10_5', operator: 'BCR', description: 'test', status: 'pending' },
    ])

    const req = mockReq({
      sourceCode: 'pragma solidity ^0.8.0; contract T {}',
      operators:  ['BCR'],
      maxMutants: 10,
    })
    const res = mockRes()

    await handleMutate(req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ count: 1 }),
      })
    )
  })
})

describe('handleGetReport', () => {
  it('retourne 404 pour un jobId inconnu', async () => {
    const req = mockReq({}, { jobId: '00000000-0000-0000-0000-000000000000' })
    const res = mockRes()

    await handleGetReport(req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(404)
  })
})