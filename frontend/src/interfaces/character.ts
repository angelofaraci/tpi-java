export type AbilityScoreName =
  | 'Strength'
  | 'Dexterity'
  | 'Constitution'
  | 'Intelligence'
  | 'Wisdom'
  | 'Charisma'

export type AbilityScores = Record<AbilityScoreName, number>

export type SkillProficiencies = Record<string, number>

export interface CharacterDetails {
  personalityTraits: string
  ideals: string
  bonds: string
  flaws: string
}

export interface CharacterUserReference {
  id: number
  username?: string
  email?: string
}

export interface CharacterCampaignReference {
  id: number
  name?: string
  description?: string
  privacy?: boolean
  creationDate?: string
}

export interface CharacterRace {
  id: number
  name: string
  description: string
  racialFeats?: string[]
}

export interface CharacterClass {
  id: number
  name?: string
  description: string
  levelCharacteristics?: Record<number, string> | Record<string, string>
  hitDice?: number
}

export interface CharacterStats {
  id?: number
  xp: number
  proficiency: number
  abilityScores: AbilityScores
  velocities: number[]
  proficiencies: SkillProficiencies
  hp: number
}

export interface Character {
  id: number
  user: CharacterUserReference
  campaign: CharacterCampaignReference
  name: string
  characterClasses?: CharacterClass[]
  characteristics: string[]
  alignment: string
  background: string
  characterStats: CharacterStats
  race: CharacterRace
}

export interface CharacterCatalogCampaignOption {
  id: number
  name: string
  description: string
  privacy: boolean
  creationDate?: string
}

export interface CharacterCatalogRaceOption {
  id: number
  name: string
  description: string
  racialFeats: string[]
}

export interface CharacterCatalogClassOption {
  id: number
  name: string
  description: string
  hitDice: number
  levelCharacteristics: Record<number, string> | Record<string, string>
}

export interface CharacterCatalogData {
  campaigns: CharacterCatalogCampaignOption[]
  races: CharacterCatalogRaceOption[]
  classes: CharacterCatalogClassOption[]
}

export interface InitialCharacterClassLevel {
  classId: number
  level: number
}

export interface CharacterDraft {
  userId: number | null
  campaignId: number | null
  name: string
  characteristics: string[]
  alignment: string
  background: string
  raceId: number | null
  classLevels: InitialCharacterClassLevel[]
  xp: number
  proficiency: number
  abilityScores: AbilityScores
  velocities: number[]
  proficiencies: SkillProficiencies
  hp: number
  details: CharacterDetails
}

export interface CreateCharacterPayload {
  user: {
    id: number
  }
  campaign: {
    id: number
  }
  name: string
  characteristics: string[]
  alignment: string
  background: string
  characterStats: {
    xp: number
    proficiency: number
    abilityScores: AbilityScores
    velocities: number[]
    proficiencies: SkillProficiencies
    hp: number
  }
  race: {
    id: number
  }
  initialClasses: Array<{
    classId: number
    level: number
  }>
}
