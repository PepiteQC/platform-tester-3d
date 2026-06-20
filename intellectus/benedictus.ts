import { Result, err, ok, toError } from './types'

export interface ValidationIssue {
  path: string
  code: string
  message: string
  expected?: string
  received?: unknown
}

export interface ValidationSuccess<T> {
  success: true
  data: T
  issues: []
}

export interface ValidationFailure {
  success: false
  data?: never
  issues: ValidationIssue[]
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

export class BenedictusValidationError extends Error {
  readonly issues: ValidationIssue[]

  constructor(contractName: string, issues: ValidationIssue[]) {
    super(
      `Validation échouée pour « ${contractName} »: ${issues
        .map(issue => `${issue.path || '<root>'}: ${issue.message}`)
        .join('; ')}`,
    )
    this.name = 'BenedictusValidationError'
    this.issues = issues
  }
}

type Parser<T> = (value: unknown, path: string) => ValidationResult<T>

export class Contract<T> {
  constructor(
    readonly name: string,
    private readonly parser: Parser<T>,
  ) {}

  safeParse(value: unknown): ValidationResult<T> {
    return this.parser(value, '')
  }

  parse(value: unknown): T {
    const result = this.safeParse(value)
    if (!result.success) {
      throw new BenedictusValidationError(this.name, result.issues)
    }
    return result.data
  }

  test(value: unknown): value is T {
    return this.safeParse(value).success
  }

  optional(): Contract<T | undefined> {
    return new Contract(`${this.name}?`, (value, path) => {
      if (value === undefined) return success(undefined)
      return this.parser(value, path)
    })
  }

  nullable(): Contract<T | null> {
    return new Contract(`${this.name} | null`, (value, path) => {
      if (value === null) return success(null)
      return this.parser(value, path)
    })
  }

  array(): Contract<T[]> {
    return Benedictus.array(this)
  }

  refine(
    predicate: (value: T) => boolean,
    message: string,
    code = 'refinement_failed',
  ): Contract<T> {
    return new Contract(`${this.name}.refined`, (value, path) => {
      const parsed = this.parser(value, path)
      if (!parsed.success) return parsed
      try {
        return predicate(parsed.data)
          ? parsed
          : failure(path, code, message, this.name, value)
      } catch (error) {
        return failure(path, 'refinement_threw', toError(error).message, this.name, value)
      }
    })
  }

  transform<U>(mapper: (value: T) => U, outputName = this.name): Contract<U> {
    return new Contract(outputName, (value, path) => {
      const parsed = this.parser(value, path)
      if (!parsed.success) return parsed
      try {
        return success(mapper(parsed.data))
      } catch (error) {
        return failure(path, 'transform_failed', toError(error).message, outputName, value)
      }
    })
  }

  default(defaultValue: T | (() => T)): Contract<T> {
    return new Contract(`${this.name}.default`, (value, path) => {
      if (value === undefined) {
        return success(typeof defaultValue === 'function'
          ? (defaultValue as () => T)()
          : defaultValue)
      }
      return this.parser(value, path)
    })
  }
}

function success<T>(data: T): ValidationSuccess<T> {
  return { success: true, data, issues: [] }
}

function failure(
  path: string,
  code: string,
  message: string,
  expected?: string,
  received?: unknown,
): ValidationFailure {
  return {
    success: false,
    issues: [{ path, code, message, expected, received }],
  }
}

function joinPath(parent: string, child: string | number): string {
  if (typeof child === 'number') return `${parent}[${child}]`
  return parent ? `${parent}.${child}` : child
}

export type InferContract<TContract> = TContract extends Contract<infer T> ? T : never

type ContractShape = Record<string, Contract<unknown>>
type InferShape<TShape extends ContractShape> = {
  [K in keyof TShape]: InferContract<TShape[K]>
}

export class Benedictus {
  private readonly registry = new Map<string, Contract<unknown>>()

  register<T>(name: string, contract: Contract<T>): Contract<T> {
    if (this.registry.has(name)) {
      throw new Error(`Un contrat Benedictus nommé « ${name} » existe déjà.`)
    }
    this.registry.set(name, contract)
    return contract
  }

  replace<T>(name: string, contract: Contract<T>): Contract<T> {
    this.registry.set(name, contract)
    return contract
  }

  get<T = unknown>(name: string): Contract<T> | null {
    return (this.registry.get(name) as Contract<T> | undefined) ?? null
  }

  validate<T>(name: string, value: unknown): Result<T, BenedictusValidationError> {
    const contract = this.get<T>(name)
    if (!contract) {
      return err(new BenedictusValidationError(name, [{
        path: '',
        code: 'contract_not_found',
        message: `Contrat introuvable: ${name}`,
      }]))
    }

    const result = contract.safeParse(value)
    return result.success
      ? ok(result.data)
      : err(new BenedictusValidationError(name, result.issues))
  }

  assert(condition: unknown, message: string, details?: unknown): asserts condition {
    if (!condition) {
      const suffix = details === undefined ? '' : ` — ${JSON.stringify(details)}`
      throw new Error(`Invariant Benedictus violé: ${message}${suffix}`)
    }
  }

  listContracts(): string[] {
    return [...this.registry.keys()].sort()
  }

  static unknown(): Contract<unknown> {
    return new Contract('unknown', value => success(value))
  }

  static any(): Contract<any> {
    return new Contract('any', value => success(value))
  }

  static string(options: {
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    trim?: boolean
    nonEmpty?: boolean
  } = {}): Contract<string> {
    return new Contract('string', (value, path) => {
      if (typeof value !== 'string') {
        return failure(path, 'invalid_type', 'Valeur attendue: string.', 'string', value)
      }

      const normalized = options.trim ? value.trim() : value
      const minLength = options.nonEmpty ? Math.max(1, options.minLength ?? 0) : options.minLength

      if (minLength !== undefined && normalized.length < minLength) {
        return failure(path, 'too_short', `Longueur minimale: ${minLength}.`, `string(min:${minLength})`, value)
      }
      if (options.maxLength !== undefined && normalized.length > options.maxLength) {
        return failure(path, 'too_long', `Longueur maximale: ${options.maxLength}.`, `string(max:${options.maxLength})`, value)
      }
      if (options.pattern && !options.pattern.test(normalized)) {
        return failure(path, 'pattern_mismatch', 'Le texte ne respecte pas le motif requis.', String(options.pattern), value)
      }
      return success(normalized)
    })
  }

  static number(options: {
    min?: number
    max?: number
    integer?: boolean
    finite?: boolean
  } = {}): Contract<number> {
    return new Contract('number', (value, path) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return failure(path, 'invalid_type', 'Valeur attendue: number.', 'number', value)
      }
      if (options.finite !== false && !Number.isFinite(value)) {
        return failure(path, 'not_finite', 'Le nombre doit être fini.', 'finite number', value)
      }
      if (options.integer && !Number.isInteger(value)) {
        return failure(path, 'not_integer', 'Le nombre doit être entier.', 'integer', value)
      }
      if (options.min !== undefined && value < options.min) {
        return failure(path, 'too_small', `Minimum: ${options.min}.`, `>= ${options.min}`, value)
      }
      if (options.max !== undefined && value > options.max) {
        return failure(path, 'too_large', `Maximum: ${options.max}.`, `<= ${options.max}`, value)
      }
      return success(value)
    })
  }

  static boolean(): Contract<boolean> {
    return new Contract('boolean', (value, path) => typeof value === 'boolean'
      ? success(value)
      : failure(path, 'invalid_type', 'Valeur attendue: boolean.', 'boolean', value))
  }

  static literal<const T extends string | number | boolean | null>(literal: T): Contract<T> {
    return new Contract(JSON.stringify(literal), (value, path) => Object.is(value, literal)
      ? success(literal)
      : failure(path, 'invalid_literal', `Valeur attendue: ${JSON.stringify(literal)}.`, JSON.stringify(literal), value))
  }

  static enum<const TValues extends readonly [string, ...string[]]>(values: TValues): Contract<TValues[number]> {
    const allowed = new Set<string>(values)
    return new Contract(`enum(${values.join('|')})`, (value, path) => {
      if (typeof value === 'string' && allowed.has(value)) {
        return success(value as TValues[number])
      }
      return failure(path, 'invalid_enum', `Valeurs permises: ${values.join(', ')}.`, values.join('|'), value)
    })
  }

  static array<T>(item: Contract<T>, options: { min?: number; max?: number } = {}): Contract<T[]> {
    return new Contract(`${item.name}[]`, (value, path) => {
      if (!Array.isArray(value)) {
        return failure(path, 'invalid_type', 'Valeur attendue: tableau.', 'array', value)
      }
      if (options.min !== undefined && value.length < options.min) {
        return failure(path, 'too_few_items', `Minimum ${options.min} élément(s).`, `array(min:${options.min})`, value.length)
      }
      if (options.max !== undefined && value.length > options.max) {
        return failure(path, 'too_many_items', `Maximum ${options.max} élément(s).`, `array(max:${options.max})`, value.length)
      }

      const parsed: T[] = []
      const issues: ValidationIssue[] = []
      value.forEach((entry, index) => {
        const result = item.safeParse(entry)
        if (result.success) {
          parsed.push(result.data)
        } else {
          issues.push(...result.issues.map(issue => ({
            ...issue,
            path: joinPath(path, index) + (issue.path ? `.${issue.path}` : ''),
          })))
        }
      })

      return issues.length > 0 ? { success: false, issues } : success(parsed)
    })
  }

  static tuple<T extends readonly Contract<unknown>[]>(contracts: T): Contract<{
    [K in keyof T]: InferContract<T[K]>
  }> {
    return new Contract('tuple', (value, path) => {
      if (!Array.isArray(value) || value.length !== contracts.length) {
        return failure(path, 'invalid_tuple', `Tuple de longueur ${contracts.length} attendu.`, `tuple(${contracts.length})`, value)
      }

      const output: unknown[] = []
      const issues: ValidationIssue[] = []
      contracts.forEach((contract, index) => {
        const result = contract.safeParse(value[index])
        if (result.success) output[index] = result.data
        else issues.push(...result.issues.map(issue => ({
          ...issue,
          path: joinPath(path, index) + (issue.path ? `.${issue.path}` : ''),
        })))
      })

      return issues.length > 0
        ? { success: false, issues }
        : success(output as { [K in keyof T]: InferContract<T[K]> })
    })
  }

  static object<TShape extends ContractShape>(
    shape: TShape,
    options: { unknownKeys?: 'strip' | 'passthrough' | 'reject' } = {},
  ): Contract<InferShape<TShape>> {
    const unknownKeys = options.unknownKeys ?? 'strip'
    return new Contract('object', (value, path) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return failure(path, 'invalid_type', 'Valeur attendue: objet.', 'object', value)
      }

      const input = value as Record<string, unknown>
      const output: Record<string, unknown> = unknownKeys === 'passthrough' ? { ...input } : {}
      const issues: ValidationIssue[] = []

      for (const [key, contract] of Object.entries(shape)) {
        const result = contract.safeParse(input[key])
        if (result.success) output[key] = result.data
        else issues.push(...result.issues.map(issue => ({
          ...issue,
          path: joinPath(path, key) + (issue.path ? `.${issue.path}` : ''),
        })))
      }

      if (unknownKeys === 'reject') {
        for (const key of Object.keys(input)) {
          if (!(key in shape)) {
            issues.push({
              path: joinPath(path, key),
              code: 'unknown_key',
              message: `Clé inconnue: ${key}.`,
              received: input[key],
            })
          }
        }
      }

      return issues.length > 0
        ? { success: false, issues }
        : success(output as InferShape<TShape>)
    })
  }

  static record<T>(valueContract: Contract<T>): Contract<Record<string, T>> {
    return new Contract(`record<string, ${valueContract.name}>`, (value, path) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return failure(path, 'invalid_type', 'Valeur attendue: dictionnaire.', 'record', value)
      }

      const output: Record<string, T> = {}
      const issues: ValidationIssue[] = []
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        const result = valueContract.safeParse(entry)
        if (result.success) output[key] = result.data
        else issues.push(...result.issues.map(issue => ({
          ...issue,
          path: joinPath(path, key) + (issue.path ? `.${issue.path}` : ''),
        })))
      }
      return issues.length > 0 ? { success: false, issues } : success(output)
    })
  }

  static union<TContracts extends readonly [Contract<unknown>, ...Contract<unknown>[]]>(
    contracts: TContracts,
  ): Contract<InferContract<TContracts[number]>> {
    return new Contract(contracts.map(contract => contract.name).join(' | '), (value, path) => {
      const failures: ValidationIssue[] = []
      for (const contract of contracts) {
        const result = contract.safeParse(value)
        if (result.success) return success(result.data as InferContract<TContracts[number]>)
        failures.push(...result.issues)
      }
      return {
        success: false,
        issues: [{
          path,
          code: 'union_mismatch',
          message: 'La valeur ne correspond à aucune branche de l’union.',
          received: value,
        }, ...failures],
      }
    })
  }

  static custom<T>(
    name: string,
    predicate: (value: unknown) => value is T,
    message = `Valeur invalide pour ${name}.`,
  ): Contract<T> {
    return new Contract(name, (value, path) => predicate(value)
      ? success(value)
      : failure(path, 'custom_validation_failed', message, name, value))
  }
}

export const benedictus = new Benedictus()
