// ============================================================
// 🎲 RANDOM — Génération aléatoire contrôlée + reproductible
// ============================================================

export class SeededRandom {
  private seed: number

  constructor(seed?: number) {
    this.seed = seed ?? Date.now()
  }

  // LCG Algorithm — reproductible
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff
    return (this.seed >>> 0) / 0xffffffff
  }

  // Entre min et max (inclus)
  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  // Entier entre min et max (inclus)
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  // Choisir un élément d'un tableau
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }

  // Choisir N éléments distincts
  pickN<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr].sort(() => this.next() - 0.5)
    return shuffled.slice(0, n)
  }

  // Boolean avec probabilité
  bool(probability = 0.5): boolean {
    return this.next() < probability
  }

  // Couleur hexadécimale aléatoire
  color(): string {
    const r = this.int(0, 255).toString(16).padStart(2, '0')
    const g = this.int(0, 255).toString(16).padStart(2, '0')
    const b = this.int(0, 255).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }

  // Couleur dans une palette
  colorVariant(base: string, variance = 30): string {
    const parse = (hex: string) => parseInt(hex, 16)
    const clamp = (v: number) => Math.max(0, Math.min(255, v))

    const r = parse(base.slice(1, 3))
    const g = parse(base.slice(3, 5))
    const b = parse(base.slice(5, 7))

    const nr = clamp(r + this.int(-variance, variance))
    const ng = clamp(g + this.int(-variance, variance))
    const nb = clamp(b + this.int(-variance, variance))

    return `#${nr.toString(16).padStart(2,'0')}${ng.toString(16).padStart(2,'0')}${nb.toString(16).padStart(2,'0')}`
  }

  // Shuffle tableau
  shuffle<T>(arr: T[]): T[] {
    const out = [...arr]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  // UUID simple
  uuid(): string {
    return [
      this.int(0, 0xffff).toString(16).padStart(4, '0'),
      this.int(0, 0xffff).toString(16).padStart(4, '0'),
      this.int(0, 0xffff).toString(16).padStart(4, '0'),
      this.int(0, 0xffff).toString(16).padStart(4, '0'),
    ].join('-')
  }
}

// Instance globale
export const rng = new SeededRandom()