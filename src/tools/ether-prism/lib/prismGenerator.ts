// ============================================================
//  PrismGenerator — Moteur créatif de TroxT
//  Orchestre la génération, les variations et l’inpainting.
// ============================================================

import type { GenerationParams, PrismOutput } from '../types'

/**
 * Garantit que les paramètres contiennent réellement un prompt.
 */
export type PromptGenerationParams = Readonly<
  GenerationParams & {
    prompt: string
  }
>

export type PrismOperation =
  | 'generate-from-prompt'
  | 'generate-variations'
  | 'inpaint'

export type PrismProgressStage =
  | 'queued'
  | 'processing'
  | 'finalizing'
  | 'completed'

export interface PrismProgress {
  readonly stage: PrismProgressStage
  readonly progress?: number
  readonly message?: string
}

export interface PrismRequestOptions {
  /**
   * Permet d’annuler une génération en cours.
   */
  readonly signal?: AbortSignal

  /**
   * Identifiant destiné aux logs et au suivi des requêtes.
   */
  readonly requestId?: string

  /**
   * Permet au fournisseur de communiquer sa progression.
   */
  readonly onProgress?: (progress: PrismProgress) => void
}

export interface PrismGeneratorConfig {
  /**
   * Protection contre la création accidentelle
   * d’un trop grand nombre de variations.
   *
   * @default 8
   */
  readonly maxVariations?: number
}

/**
 * Contrat que doit respecter un moteur concret :
 * API distante, modèle local, worker, serveur GPU, etc.
 */
export interface PrismProvider<TInput, TMask = TInput> {
  generateFromPrompt(
    params: PromptGenerationParams,
    options: PrismRequestOptions,
  ): Promise<PrismOutput>

  generateVariations(
    input: TInput,
    count: number,
    options: PrismRequestOptions,
  ): Promise<readonly PrismOutput[]>

  inpaint(
    input: TInput,
    mask: TMask,
    prompt: string,
    options: PrismRequestOptions,
  ): Promise<PrismOutput>
}

/**
 * Erreur normalisée exposée par PrismGenerator.
 */
export class PrismGeneratorError extends Error {
  constructor(
    public readonly operation: PrismOperation,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)

    this.name = 'PrismGeneratorError'

    // Assure un héritage correct avec certaines anciennes cibles JavaScript.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

const DEFAULT_MAX_VARIATIONS = 8

export class PrismGenerator<TInput, TMask = TInput> {
  private readonly provider: PrismProvider<TInput, TMask>
  private readonly maxVariations: number

  constructor(
    provider: PrismProvider<TInput, TMask>,
    config: PrismGeneratorConfig = {},
  ) {
    assertValidProvider(provider)

    this.provider = provider
    this.maxVariations =
      config.maxVariations ?? DEFAULT_MAX_VARIATIONS

    assertPositiveInteger(
      this.maxVariations,
      'config.maxVariations',
    )
  }

  /**
   * Génère un visuel à partir d’un prompt.
   *
   * Lance une PrismGeneratorError en cas d’échec au lieu
   * de retourner silencieusement null.
   */
  async generateFromPrompt(
    params: PromptGenerationParams,
    options: PrismRequestOptions = {},
  ): Promise<PrismOutput> {
    const prompt = normalizePrompt(params.prompt)

    const normalizedParams: PromptGenerationParams = {
      ...params,
      prompt,
    }

    return this.execute(
      'generate-from-prompt',
      options.signal,
      async () => {
        const output = await this.provider.generateFromPrompt(
          normalizedParams,
          options,
        )

        return assertValidOutput(output)
      },
    )
  }

  /**
   * Génère plusieurs variations depuis une entrée existante.
   */
  async generateVariations(
    input: TInput,
    count: number,
    options: PrismRequestOptions = {},
  ): Promise<PrismOutput[]> {
    assertPresent(input, 'input')
    assertVariationCount(count, this.maxVariations)

    return this.execute(
      'generate-variations',
      options.signal,
      async () => {
        const outputs = await this.provider.generateVariations(
          input,
          count,
          options,
        )

        if (!Array.isArray(outputs)) {
          throw new TypeError(
            'Le fournisseur doit retourner un tableau de PrismOutput.',
          )
        }

        if (outputs.length > count) {
          throw new RangeError(
            `Le fournisseur a retourné ${outputs.length} variations alors que ${count} étaient demandées.`,
          )
        }

        outputs.forEach((output, index) => {
          try {
            assertValidOutput(output)
          } catch (error) {
            throw new TypeError(
              `La variation située à l’index ${index} est invalide.`,
              { cause: error },
            )
          }
        })

        // Retourne une copie afin de ne pas exposer le tableau du fournisseur.
        return [...outputs]
      },
    )
  }

  /**
   * Modifie uniquement la zone définie par le masque.
   */
  async inpaint(
    input: TInput,
    mask: TMask,
    prompt: string,
    options: PrismRequestOptions = {},
  ): Promise<PrismOutput> {
    assertPresent(input, 'input')
    assertPresent(mask, 'mask')

    const normalizedPrompt = normalizePrompt(prompt)

    return this.execute(
      'inpaint',
      options.signal,
      async () => {
        const output = await this.provider.inpaint(
          input,
          mask,
          normalizedPrompt,
          options,
        )

        return assertValidOutput(output)
      },
    )
  }

  /**
   * Centralise l’annulation et la normalisation des erreurs.
   */
  private async execute<TResult>(
    operation: PrismOperation,
    signal: AbortSignal | undefined,
    task: () => Promise<TResult>,
  ): Promise<TResult> {
    signal?.throwIfAborted()

    try {
      const result = await task()

      // Évite de retourner un résultat devenu inutile
      // si l’annulation est arrivée juste avant la résolution.
      signal?.throwIfAborted()

      return result
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) {
        throw error
      }

      if (error instanceof PrismGeneratorError) {
        throw error
      }

      throw new PrismGeneratorError(
        operation,
        `Échec de l’opération Prism « ${operation} ».`,
        error,
      )
    }
  }
}

function normalizePrompt(prompt: string): string {
  if (typeof prompt !== 'string') {
    throw new TypeError('Le prompt doit être une chaîne de caractères.')
  }

  const normalizedPrompt = prompt.trim()

  if (normalizedPrompt.length === 0) {
    throw new TypeError('Le prompt ne peut pas être vide.')
  }

  return normalizedPrompt
}

function assertPresent(
  value: unknown,
  name: string,
): void {
  if (value === null || value === undefined) {
    throw new TypeError(`${name} est obligatoire.`)
  }
}

function assertPositiveInteger(
  value: number,
  name: string,
): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(
      `${name} doit être un entier supérieur ou égal à 1.`,
    )
  }
}

function assertVariationCount(
  count: number,
  maximum: number,
): void {
  assertPositiveInteger(count, 'count')

  if (count > maximum) {
    throw new RangeError(
      `count ne peut pas dépasser ${maximum}. Valeur reçue : ${count}.`,
    )
  }
}

function assertValidOutput(
  output: PrismOutput | null | undefined,
): PrismOutput {
  if (output === null || output === undefined) {
    throw new TypeError(
      'Le fournisseur n’a retourné aucun PrismOutput.',
    )
  }

  return output
}

function assertValidProvider<TInput, TMask>(
  provider: PrismProvider<TInput, TMask>,
): void {
  if (
    !provider ||
    typeof provider.generateFromPrompt !== 'function' ||
    typeof provider.generateVariations !== 'function' ||
    typeof provider.inpaint !== 'function'
  ) {
    throw new TypeError(
      'Le fournisseur Prism est absent ou incomplet.',
    )
  }
}

function isAbortError(error: unknown): boolean {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('name' in error)
  ) {
    return false
  }

  return error.name === 'AbortError'
}

export function createPrismGenerator<TInput, TMask = TInput>(
  provider: PrismProvider<TInput, TMask>,
  config?: PrismGeneratorConfig,
): PrismGenerator<TInput, TMask> {
  return new PrismGenerator(provider, config)
}

export default PrismGenerator