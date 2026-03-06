import type {
  AbilityScores,
  CharacterCatalogClassOption,
  CharacterCatalogData,
  CharacterDetails,
  CharacterDraft,
  CreateCharacterPayload,
  InitialCharacterClassLevel,
} from '../interfaces/character'

export const DEFAULT_ABILITY_SCORES: AbilityScores = {
  Strength: 10,
  Dexterity: 10,
  Constitution: 10,
  Intelligence: 10,
  Wisdom: 10,
  Charisma: 10,
}

export const DEFAULT_PROFICIENCIES: CharacterDraft['proficiencies'] = {
  Acrobatics: 0,
  'Animal Handling': 0,
  Arcana: 0,
  Athletics: 0,
  Deception: 0,
  History: 0,
  Insight: 0,
  Intimidation: 0,
  Investigation: 0,
  Medicine: 0,
  Nature: 0,
  Perception: 0,
  Performance: 0,
  Persuasion: 0,
  Religion: 0,
  'Sleight of Hand': 0,
  Stealth: 0,
  Survival: 0,
  Strength: 0,
  Dexterity: 0,
  Constitution: 0,
  Intelligence: 0,
  Wisdom: 0,
  Charisma: 0,
}

export const DEFAULT_CHARACTER_DETAILS: CharacterDetails = {
  personalityTraits: '',
  ideals: '',
  bonds: '',
  flaws: '',
}

export const DEFAULT_CHARACTER_DRAFT: CharacterDraft = {
  userId: null,
  campaignId: null,
  name: '',
  characteristics: [],
  alignment: '',
  background: '',
  raceId: null,
  classLevels: [],
  xp: 0,
  proficiency: 2,
  abilityScores: DEFAULT_ABILITY_SCORES,
  velocities: [30],
  proficiencies: DEFAULT_PROFICIENCIES,
  hp: 1,
  details: DEFAULT_CHARACTER_DETAILS,
}

function cloneAbilityScores(scores: AbilityScores): AbilityScores {
  return {
    Strength: scores.Strength,
    Dexterity: scores.Dexterity,
    Constitution: scores.Constitution,
    Intelligence: scores.Intelligence,
    Wisdom: scores.Wisdom,
    Charisma: scores.Charisma,
  }
}

function cloneCharacterDetails(details: CharacterDetails): CharacterDetails {
  return {
    personalityTraits: details.personalityTraits,
    ideals: details.ideals,
    bonds: details.bonds,
    flaws: details.flaws,
  }
}

function sanitizeProficiencies(proficiencies: CharacterDraft['proficiencies']): CharacterDraft['proficiencies'] {
  return Object.fromEntries(
    Object.entries(DEFAULT_PROFICIENCIES).map(([name, defaultValue]) => {
      const nextValue = proficiencies[name]

      if (nextValue === 1 || nextValue === 2) {
        return [name, nextValue]
      }

      return [name, defaultValue]
    }),
  )
}

function appendCharacteristicSection(characteristics: string[], label: string, value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return characteristics
  }

  return [...characteristics, `${label}: ${trimmed}`]
}

function sanitizeClassLevels(classLevels: InitialCharacterClassLevel[]): InitialCharacterClassLevel[] {
  return classLevels
    .filter((entry) => Number.isFinite(entry.classId) && entry.classId > 0)
    .map((entry) => ({
      classId: entry.classId,
      level: Number.isFinite(entry.level) && entry.level > 0 ? entry.level : 1,
    }))
}

export function createCharacterDraft(overrides: Partial<CharacterDraft> = {}): CharacterDraft {
  return {
    ...DEFAULT_CHARACTER_DRAFT,
    ...overrides,
    characteristics: overrides.characteristics ? [...overrides.characteristics] : [...DEFAULT_CHARACTER_DRAFT.characteristics],
    classLevels: overrides.classLevels ? sanitizeClassLevels(overrides.classLevels) : [],
    abilityScores: cloneAbilityScores(overrides.abilityScores ?? DEFAULT_CHARACTER_DRAFT.abilityScores),
    velocities: overrides.velocities ? [...overrides.velocities] : [...DEFAULT_CHARACTER_DRAFT.velocities],
    proficiencies: sanitizeProficiencies(overrides.proficiencies ?? DEFAULT_CHARACTER_DRAFT.proficiencies),
    details: cloneCharacterDetails(overrides.details ?? DEFAULT_CHARACTER_DRAFT.details),
  }
}

export function buildCreateCharacterPayload(draft: CharacterDraft): CreateCharacterPayload {
  if (!draft.userId) {
    throw new Error('Character draft requires a userId')
  }

  if (!draft.campaignId) {
    throw new Error('Character draft requires a campaignId')
  }

  if (!draft.raceId) {
    throw new Error('Character draft requires a raceId')
  }

  const classLevels = sanitizeClassLevels(draft.classLevels)

  if (classLevels.length === 0) {
    throw new Error('Character draft requires at least one class')
  }

  let characteristics = draft.characteristics.map((entry) => entry.trim()).filter(Boolean)
  characteristics = appendCharacteristicSection(characteristics, 'Personality Trait', draft.details.personalityTraits)
  characteristics = appendCharacteristicSection(characteristics, 'Ideal', draft.details.ideals)
  characteristics = appendCharacteristicSection(characteristics, 'Bond', draft.details.bonds)
  characteristics = appendCharacteristicSection(characteristics, 'Flaw', draft.details.flaws)

  return {
    user: { id: draft.userId },
    campaign: { id: draft.campaignId },
    name: draft.name.trim(),
    characteristics,
    alignment: draft.alignment.trim(),
    background: draft.background.trim(),
    characterStats: {
      xp: draft.xp,
      proficiency: draft.proficiency,
      abilityScores: cloneAbilityScores(draft.abilityScores),
      velocities: [...draft.velocities],
      proficiencies: sanitizeProficiencies(draft.proficiencies),
      hp: draft.hp,
    },
    race: { id: draft.raceId },
    initialClasses: classLevels,
  }
}

export function getCharacterCatalogSelections(
  draft: Pick<CharacterDraft, 'campaignId' | 'raceId' | 'classLevels'>,
  catalog: CharacterCatalogData,
) {
  const selectedCampaign = catalog.campaigns.find((campaign) => campaign.id === draft.campaignId) ?? null
  const selectedRace = catalog.races.find((race) => race.id === draft.raceId) ?? null
  const selectedClasses = draft.classLevels
    .map((entry) => {
      const option = catalog.classes.find((dndClass) => dndClass.id === entry.classId)

      if (!option) {
        return null
      }

      return {
        ...option,
        level: entry.level,
      }
    })
    .filter((entry): entry is CharacterCatalogClassOption & { level: number } => entry !== null)

  return {
    selectedCampaign,
    selectedRace,
    selectedClasses,
  }
}
