// ============================================================
//  SKILLREGISTRY.ts — Registre de compétences de TroxT
//  Chaque skill = un outil que l'agent peut invoquer.
// ============================================================

import type { TroxTBridge } from '../../../core/troxt-bridge'
import type { Memory } from '../../../core/memory'
import type { EpisodicMemory } from '../memory/EpisodicMemory'

export interface SkillContext {
  bridge: TroxTBridge
  memory: Memory
  episodic: EpisodicMemory
  emit: (type: string, payload: unknown) => void
}

export interface SkillDefinition {
  id: string
  name: string
  description: string
  params: Record<string, string> // nom → type
  dangerous: boolean
  requiresOnline?: boolean
  handler: (params: Record<string, unknown>, ctx: SkillContext) => Promise<SkillResult>
}

export interface SkillResult {
  success: boolean
  summary: string
  detail: unknown
}

export interface SkillCall {
  skillId: string
  params: Record<string, unknown>
  reason?: string
  confidence?: number
}

export class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map()

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill)
  }

  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id)
  }

  listAvailable(): { id: string; description: string; params: string[] }[] {
    return Array.from(this.skills.values()).map(s => ({
      id: s.id,
      description: `${s.name} : ${s.description}`,
      params: Object.keys(s.params)
    }))
  }

  has(id: string): boolean {
    return this.skills.has(id)
  }

  unregister(id: string): boolean {
    return this.skills.delete(id)
  }

  get count(): number {
    return this.skills.size
  }
}

export default SkillRegistry
// src/agents/troxt/skills/SkillRegistry.ts
import { EtherSkills } from './EtherSkills';
import { MutationTestingSkill } from './MutationTestingSkill';
// ... autres imports

export class SkillRegistry {
  private skills: Map<string, any> = new Map();

  constructor() {
    this.registerDefaultSkills();
  }

  private registerDefaultSkills() {
    this.skills.set('etherSkills', new EtherSkills());
    this.skills.set('mutationTesting', new MutationTestingSkill());
    // ... autres compétences
  }

  getSkill(skillName: string): any {
    return this.skills.get(skillName);
  }

  hasSkill(skillName: string): boolean {
    return this.skills.has(skillName);
  }

  listSkills(): string[] {
    return Array.from(this.skills.keys());
  }
}
