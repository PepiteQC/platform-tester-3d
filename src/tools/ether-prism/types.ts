// ============================================================
//  EtherPrism — Types
//  Organe visuel de TroxT
// ============================================================

export interface PrismConfig {
  id: string
  name: string
  mode: PrismMode
  resolution: [number, number]
  colorSpace: 'sRGB' | 'linear' | 'HDR'
}

export type PrismMode =
  | 'analyze'
  | 'generate'
  | 'enhance'
  | 'compress'
  | 'batch'

export interface PrismInput {
  type: 'image' | 'url' | 'base64' | 'buffer'
  data: unknown
  metadata?: Record<string, unknown>
}

export interface PrismOutput {
  id: string
  input: PrismInput
  result: unknown
  mode: PrismMode
  processedAt: number
  duration: number
}

export interface PrismState {
  isProcessing: boolean
  queue: PrismInput[]
  results: PrismOutput[]
  error: string | null
}

export interface AnalysisResult {
  colors: string[]
  dimensions: [number, number]
  format: string
  size: number
  tags: string[]
  description: string
}

export interface GenerationParams {
  prompt: string
  width: number
  height: number
  style: string
  seed?: number
}

export interface CompressionOptions {
  quality: number
  format: 'webp' | 'jpeg' | 'png' | 'avif'
  maxWidth?: number
  maxHeight?: number
}

export interface BatchJob {
  id: string
  items: PrismInput[]
  mode: PrismMode
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  results: PrismOutput[]
}

export interface EnhanceOptions {
  upscale?: number
  denoise?: boolean
  sharpen?: boolean
  colorCorrect?: boolean
  style?: string
}