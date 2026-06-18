// ============================================================
//  REASONINGENGINE.ts — Cortex Préfrontal
//  Chain-of-Thought + ReAct + Planning DAG
// ============================================================

import { PersonalityProfile } from './TroxTBrain'

export interface ThoughtStep {
  id: string
  type: 'thought' | 'skill_call' | 'observation' | 'final_answer'
  content: string
  skill?: string
  params?: Record<string, unknown>
  confidence: number
  dependencies: string[] // IDs des étapes requises
}

export interface ThoughtChain {
  goal: string
  steps: ThoughtStep[]
  overallConfidence: number
  estimatedCost: number // ms approximatif
  createdAt: number
}

export interface PlanStep {
  id: string
  action: string
  status: 'pending' | 'running' | 'done' | 'failed'
  result?: unknown
  retryCount: number
  maxRetries: number
}

export class ReasoningEngine {
  private personality: PersonalityProfile
  private planHistory: PlanStep[] = []
  private thoughtCounter = 0

  constructor(personality: PersonalityProfile) {
    this.personality = personality
  }

  // ═══════════════════════════════════════════════════════════
  //  COGNITION PRINCIPALE — Think
  // ═══════════════════════════════════════════════════════════
  async think(input: {
    input: string
    context: string
    personality: PersonalityProfile
    availableSkills: { id: string; description: string; params: string[] }[]
    memorySnapshot: { content: string; timestamp: number }[]
  }): Promise<ThoughtChain> {
    const start = Date.now()
    const steps: ThoughtStep[] = []

    // Étape 1 : Comprendre la requête (Observation)
    steps.push({
      id: `obs_${++this.thoughtCounter}`,
      type: 'observation',
      content: `Observation : l'utilisateur demande « ${input.input} ». Contexte module actif.`,
      confidence: 0.95,
      dependencies: []
    })

    // Étape 2 : Récupération mémoire (ReAct : Retrieve)
    if (input.memorySnapshot.length > 0) {
      steps.push({
        id: `mem_${++this.thoughtCounter}`,
        type: 'thought',
        content: `Mémoire pertinente : ${input.memorySnapshot.map(m => m.content).join('; ')}`,
        confidence: 0.85,
        dependencies: [steps[0].id]
      })
    }

    // Étape 3 : Parsing d'intention + Skill matching
    const intent = this.parseIntent(input.input)
    const matched = this.matchSkills(intent, input.availableSkills)

    if (matched.length > 0) {
      // Stratégie : ReAct (Reasoning + Acting)
      for (const skill of matched) {
        steps.push({
          id: `act_${++this.thoughtCounter}`,
          type: 'skill_call',
          content: `Action : appeler ${skill.id} pour résoudre ${intent.verb}`,
          skill: skill.id,
          params: this.extractParams(input.input, skill.params),
          confidence: skill.score,
          dependencies: steps.length > 1 ? [steps[steps.length - 1].id] : [steps[0].id]
        })
      }
    } else {
      // Pas de skill → pure réflexion / conversation
      steps.push({
        id: `think_${++this.thoughtCounter}`,
        type: 'thought',
        content: `Aucun skill direct. Je vais formuler une réponse basée sur le contexte et la personnalité.`,
        confidence: 0.7,
        dependencies: [steps[0].id]
      })
    }

    // Étape 4 : Réponse finale
    const finalContent = this.generateAnswer(input.input, intent, matched, input.personality)
    steps.push({
      id: `ans_${++this.thoughtCounter}`,
      type: 'final_answer',
      content: finalContent,
      confidence: matched.length > 0
        ? Math.min(...matched.map(m => m.score))
        : 0.8,
      dependencies: steps.filter(s => s.type !== 'final_answer').map(s => s.id)
    })

    return {
      goal: intent.verb,
      steps,
      overallConfidence: steps.reduce((acc, s) => acc + s.confidence, 0) / steps.length,
      estimatedCost: Date.now() - start + matched.length * 150,
      createdAt: start
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PLANNING — DAG Builder
  // ═══════════════════════════════════════════════════════════
  buildPlan(goal: string, subGoals: string[]): PlanStep[] {
    const plan: PlanStep[] = subGoals.map((g, i) => ({
      id: `plan_${Date.now()}_${i}`,
      action: g,
      status: 'pending',
      retryCount: 0,
      maxRetries: this.personality.prudence > 0.5 ? 3 : 1
    }))

    this.planHistory.push(...plan)
    return plan
  }

  async executePlan(plan: PlanStep[], executor: (step: PlanStep) => Promise<unknown>): Promise<PlanStep[]> {
    for (const step of plan) {
      step.status = 'running'
      try {
        step.result = await executor(step)
        step.status = 'done'
      } catch (e) {
        step.retryCount++
        if (step.retryCount >= step.maxRetries) {
          step.status = 'failed'
          // Self-correction : on tente une reformulation
          if (this.personality.creativity > 0.4) {
            step.action = `Reformulated: ${step.action}`
            step.retryCount = 0
            step.status = 'pending'
            try {
              step.result = await executor(step)
              step.status = 'done'
            } catch {
              step.status = 'failed'
            }
          }
        } else {
          step.status = 'pending' // Retenter plus tard
        }
      }
    }
    return plan
  }

  // ═══════════════════════════════════════════════════════════
  //  INTENTION PARSING
  // ═══════════════════════════════════════════════════════════
  private parseIntent(text: string): { verb: string; object: string; adverbs: string[] } {
    const lower = text.toLowerCase()

    const verbs = [
      { key: 'créer', v: 'create' }, { key: 'create', v: 'create' },
      { key: 'ajouter', v: 'add' }, { key: 'add', v: 'add' },
      { key: 'supprimer', v: 'delete' }, { key: 'delete', v: 'delete' },
      { key: 'modifier', v: 'update' }, { key: 'update', v: 'update' },
      { key: 'générer', v: 'generate' }, { key: 'generate', v: 'generate' },
      { key: 'analyser', v: 'analyze' }, { key: 'analyze', v: 'analyze' },
      { key: 'exporter', v: 'export' }, { key: 'export', v: 'export' },
      { key: 'décrire', v: 'describe' }, { key: 'describe', v: 'describe' },
      { key: 'téléporter', v: 'teleport' }, { key: 'teleport', v: 'teleport' },
      { key: 'snapshot', v: 'snapshot' }, { key: 'backup', v: 'snapshot' },
      { key: 'kick', v: 'kick' }, { key: 'expulser', v: 'kick' },
      { key: 'aide', v: 'help' }, { key: 'help', v: 'help' }
    ]

    let verb = 'chat' // default
    for (const v of verbs) {
      if (lower.includes(v.key)) { verb = v.v; break }
    }

    // Extraction simple d'objet (mot après le verbe principal)
    const words = lower.split(/\s+/)
    const verbIdx = words.findIndex(w => verbs.some(v => v.key === w))
    const object = verbIdx >= 0 && verbIdx < words.length - 1
      ? words.slice(verbIdx + 1, verbIdx + 4).join(' ')
      : lower

    const adverbs = ['vite', 'rapidement', 'slowly', 'carefully'].filter(a => lower.includes(a))

    return { verb, object, adverbs }
  }

  // ═══════════════════════════════════════════════════════════
  //  SKILL MATCHING
  // ═══════════════════════════════════════════════════════════
  private matchSkills(
    intent: { verb: string; object: string },
    skills: { id: string; description: string; params: string[] }[]
  ): { id: string; score: number; params: string[] }[] {
    const scored = skills.map(s => {
      const desc = s.description.toLowerCase()
      let score = 0

      // Vérbe matching
      if (desc.includes(intent.verb)) score += 0.6
      if (s.id.includes(intent.verb)) score += 0.5

      // Object matching
      const objWords = intent.object.split(' ')
      objWords.forEach(w => { if (desc.includes(w)) score += 0.15 })

      // Module hint
      if (intent.object.includes('prism') && s.id.includes('prism')) score += 0.3
      if (intent.object.includes('forge') && s.id.includes('forge')) score += 0.3
      if (intent.object.includes('lens') && s.id.includes('lens')) score += 0.3
      if (intent.object.includes('weave') && s.id.includes('weave')) score += 0.3
      if (intent.object.includes('world') && s.id.includes('world')) score += 0.3

      return { id: s.id, score: Math.min(1, score), params: s.params }
    }).filter(s => s.score > 0.35).sort((a, b) => b.score - a.score)

    return scored.slice(0, 3) // Top 3
  }

  private extractParams(text: string, paramDefs: string[]): Record<string, unknown> {
    const params: Record<string, unknown> = {}

    // Extraction simple par regex
    const numberMatch = text.match(/\b(\d+(?:\.\d+)?)\b/g)
    if (numberMatch && paramDefs.includes('count')) params.count = parseFloat(numberMatch[0])
    if (numberMatch && paramDefs.includes('id')) params.id = parseInt(numberMatch[0])

    const nameMatch = text.match(/(?:nommée?|appelée?|named?|called?)\s+["']?([^"']+)["']?/i)
    if (nameMatch && paramDefs.includes('name')) params.name = nameMatch[1].trim()

    const colorMatch = text.match(/(?:couleur|color)\s+[#]?([0-9a-fA-F]{6})/i)
    if (colorMatch && paramDefs.includes('color')) params.color = `#${colorMatch[1]}`

    if (paramDefs.includes('query')) params.query = text
    if (paramDefs.includes('text')) params.text = text

    return params
  }

  private generateAnswer(
    input: string,
    intent: { verb: string; object: string },
    skills: { id: string; score: number }[],
    personality: PersonalityProfile
  ): string {
    if (skills.length > 0) {
      const skillNames = skills.map(s => s.id.replace(/_/g, ' ')).join(', ')
      const prefixes = personality.verbosity > 0.7
        ? [
            'Bien sûr, je m\'en occupe. Je vais utiliser mes capacités internes.',
            'Entendu ! J\'ai identifié la bonne procédure pour cela.',
            'Ça marche. Laissez-moi orchestrer les modules nécessaires.'
          ]
        : ['OK.', 'Roger.', 'C\'est parti.']

      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
      return `${prefix} Action : ${skillNames} → ${intent.object}.`
    }

    // Réponse conversationnelle par défaut
    const casual = personality.empathy > 0.6
      ? [
          `Je comprends votre demande concernant « ${input} ». Pouvez-vous préciser si vous voulez agir sur Prism, Forge, Lens ou Weave ?`,
          `Hmm, je capte l'idée. Vous voulez faire quelque chose avec : ${intent.object} ? Dites-moi le module visé.`,
          `Intéressant ! Je n'ai pas trouvé de skill direct pour ça. On peut en créer un ensemble si vous le souhaitez.`
        ]
      : [
          `Requête non mappée. Modules disponibles : prism, forge, lens, weave.`,
          `Intent : ${intent.verb}. Object : ${intent.object}. Aucun skill matché. Précisez le module.`
        ]

    return casual[Math.floor(Math.random() * casual.length)]
  }

  // ═══════════════════════════════════════════════════════════
  //  MÉTA-COGNITION
  // ═══════════════════════════════════════════════════════════
  reflect(lastChain: ThoughtChain, outcome: 'success' | 'partial' | 'failure'): void {
    const reflection: ThoughtStep = {
      id: `refl_${++this.thoughtCounter}`,
      type: 'thought',
      content: `Réflexion : l'action a été un ${outcome}. Confiance initiale : ${lastChain.overallConfidence.toFixed(2)}.`,
      confidence: 0.9,
      dependencies: []
    }

    // Si échec et prudence haute, on note une règle d'évitement
    if (outcome === 'failure' && this.personality.prudence > 0.5) {
      reflection.content += ` Je vais désormais demander confirmation avant ${lastChain.goal}.`
    }

    // Si succès, on renforce la confiance du skill utilisé
    if (outcome === 'success') {
      reflection.content += ` Skill ${lastChain.goal} confirmé fiable. Confiance renforcée.`
    }

    // Stocker dans mémoire (via event indirect)
    console.log('[Reasoning]', reflection.content)
  }
}

export default ReasoningEngine

