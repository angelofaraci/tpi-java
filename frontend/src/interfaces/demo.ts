import type { AbilityScoreName } from './character'

export interface DemoCampaignSummary {
  id: number
  name: string
  description?: string
  creationDate?: string
  characterCount?: number
}

export interface DemoCharacterSummary {
  id: number
  name: string
  raceName?: string
  level?: number
  alignment?: string
  portraitUrl?: string
}

export interface DemoClassLevel {
  classId: number
  description: string
  level: number
  features: Array<{ level: number; text: string }>
}

export interface DemoCampaignDetail {
  id: number
  name: string
  description?: string
  creationDate?: string
  characters: DemoCharacterSummary[]
}

export interface DemoCharacterDetail {
  id: number
  name: string
  raceName?: string
  racialFeats?: string[]
  background?: string
  characteristics?: string[]
  alignment?: string
  portraitUrl?: string
  proficiency?: number
  abilityScores?: Partial<Record<AbilityScoreName, number>>
  proficiencies?: Record<string, number>
  velocity?: number
  hp?: number
  classes?: DemoClassLevel[]
}
