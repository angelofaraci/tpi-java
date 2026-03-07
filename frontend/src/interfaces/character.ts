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

export interface CharacterStatsUpdatePayload {
  character?: {
    id: number
  }
  xp?: number
  proficiency?: number
  abilityScores?: AbilityScores
  velocities?: number[]
  proficiencies?: SkillProficiencies
  hp?: number
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

export interface LevelRecord {
  id?: {
    characterId?: number | string
    classId?: number | string
  }
  character?: {
    id?: number | string
  }
  dndClass?: {
    id?: number | string
    name?: string
    description?: string
    hitDice?: number
    levelCharacteristics?: Record<number, string> | Record<string, string> | Record<string, unknown>
  }
  level?: number | string
}

export interface LevelPayload {
  character: {
    id: number
  }
  dndClass: {
    id: number
  }
  level: number
}

export interface ParsedCharacteristicDetails {
  characteristics: string[]
  details: CharacterDetails
}

export interface HydratedCharacterClassRow {
  characterId: number
  classId: number
  name?: string
  description: string
  level: number
  hitDice?: number
  levelCharacteristics?: Record<number, string> | Record<string, string>
}

export interface HydratedCharacterEditData {
  characterId: number
  statsId: number | null
  draft: CharacterDraft
  classRows: HydratedCharacterClassRow[]
}

export interface CharacterUpdatePayload {
  campaign?: {
    id: number
  }
  name?: string
  characteristics?: string[]
  alignment?: string
  background?: string
  race?: {
    id: number
  }
}

export type CharacterClassUpdateOperation =
  | {
      type: 'create'
      characterId: number
      classId: number
      nextLevel: number
      payload: LevelPayload
    }
  | {
      type: 'update'
      characterId: number
      classId: number
      previousLevel: number
      nextLevel: number
      payload: LevelPayload
    }
  | {
      type: 'delete'
      characterId: number
      classId: number
      previousLevel: number
    }
  | {
      type: 'noop'
      characterId: number
      classId: number
      previousLevel: number
      nextLevel: number
    }

export interface CharacterUpdatePlan {
  characterPatch: CharacterUpdatePayload | null
  statsPatch: CharacterStatsUpdatePayload | null
  classOperations: CharacterClassUpdateOperation[]
  hasChanges: boolean
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

export type CreateCharacterInitialClass = InitialCharacterClassLevel

// Create mode must submit exactly one primary class and may include one optional second class.
export type CreateCharacterInitialClasses = [CreateCharacterInitialClass] | [CreateCharacterInitialClass, CreateCharacterInitialClass]

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
  initialClasses: CreateCharacterInitialClasses
}
