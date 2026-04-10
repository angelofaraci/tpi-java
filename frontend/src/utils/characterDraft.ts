import type {
  AbilityScores,
  AbilityScoreName,
  CharacterCatalogClassOption,
  CharacterCatalogData,
  CharacterDetails,
  CharacterDraft,
  CreateCharacterInitialClasses,
  CharacterStatsUpdatePayload,
  CharacterUpdatePayload,
  CharacterUpdatePlan,
  CreateCharacterPayload,
  HydratedCharacterClassRow,
  HydratedCharacterEditData,
  InitialCharacterClassLevel,
  LevelPayload,
  LevelRecord,
  ParsedCharacteristicDetails,
  Character,
} from '../interfaces/character'

const DETAIL_LABELS: Array<{ label: string; key: keyof CharacterDetails }> = [
  { label: 'Personality Trait', key: 'personalityTraits' },
  { label: 'Ideal', key: 'ideals' },
  { label: 'Bond', key: 'bonds' },
  { label: 'Flaw', key: 'flaws' },
]

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

export function resolveDrivingClass(classLevels: InitialCharacterClassLevel[]): InitialCharacterClassLevel | null {
  let winner: InitialCharacterClassLevel | null = null

  classLevels.forEach((entry) => {
    const normalized = normalizeClassLevelEntry(entry)

    if (!normalized) {
      return
    }

    if (!winner || normalized.level > winner.level) {
      winner = normalized
    }
  })

  return winner
}

export function deriveProficiencyFromLevel(level: number) {
  if (level >= 17) return 6
  if (level >= 13) return 5
  if (level >= 9) return 4
  if (level >= 5) return 3
  return 2
}

const XP_BY_LEVEL: Record<number, number> = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
}

export function deriveXpFromLevel(level: number) {
  const normalizedLevel = Math.min(20, Math.max(1, Math.trunc(level)))
  return XP_BY_LEVEL[normalizedLevel] ?? 0
}

export function deriveSavingThrowDefaults(
  classLevels: InitialCharacterClassLevel[],
  classes: CharacterCatalogClassOption[],
): Record<AbilityScoreName, number> {
  const defaults: Record<AbilityScoreName, number> = {
    Strength: 0,
    Dexterity: 0,
    Constitution: 0,
    Intelligence: 0,
    Wisdom: 0,
    Charisma: 0,
  }

  const drivingClass = resolveDrivingClass(classLevels)

  if (!drivingClass) {
    return defaults
  }

  const classData = classes.find((c) => c.id === drivingClass.classId)
  const savingThrows = classData?.savingThrows ?? []

  for (const t of savingThrows) {
    if (t in defaults) {
      defaults[t as AbilityScoreName] = 1
    }
  }

  return defaults
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

function buildCharacteristicList(characteristics: string[], details: CharacterDetails) {
  let nextCharacteristics = characteristics.map((entry) => entry.trim()).filter(Boolean)
  nextCharacteristics = appendCharacteristicSection(nextCharacteristics, 'Personality Trait', details.personalityTraits)
  nextCharacteristics = appendCharacteristicSection(nextCharacteristics, 'Ideal', details.ideals)
  nextCharacteristics = appendCharacteristicSection(nextCharacteristics, 'Bond', details.bonds)
  nextCharacteristics = appendCharacteristicSection(nextCharacteristics, 'Flaw', details.flaws)
  return nextCharacteristics
}

function getDetailLabelMatch(entry: string) {
  const separatorIndex = entry.indexOf(':')

  if (separatorIndex === -1) {
    return null
  }

  const rawLabel = entry.slice(0, separatorIndex).trim().toLowerCase()
  const value = entry.slice(separatorIndex + 1).trim()

  if (!value) {
    return null
  }

  const match = DETAIL_LABELS.find(({ label }) => label.toLowerCase() === rawLabel)

  if (!match) {
    return null
  }

  return {
    key: match.key,
    value,
  }
}

function normalizeNumber(value: number | string | undefined | null) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeLevelCharacteristics(
  input: Record<number, string> | Record<string, string> | Record<string, unknown> | undefined,
) {
  if (!input || typeof input !== 'object') {
    return undefined
  }

  const entries = Object.entries(input).filter(([, value]) => typeof value === 'string')

  if (entries.length === 0) {
    return undefined
  }

  return Object.fromEntries(entries) as Record<string, string>
}

function areNumberArraysEqual(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function areRecordValuesEqual(left: Record<string, number>, right: Record<string, number>) {
  const leftEntries = Object.entries(left)
  const rightEntries = Object.entries(right)

  if (leftEntries.length !== rightEntries.length) {
    return false
  }

  return leftEntries.every(([key, value]) => right[key] === value)
}

function areCharacterDetailsEqual(left: CharacterDetails, right: CharacterDetails) {
  return (
    left.personalityTraits === right.personalityTraits &&
    left.ideals === right.ideals &&
    left.bonds === right.bonds &&
    left.flaws === right.flaws
  )
}

function areClassLevelsEqual(left: InitialCharacterClassLevel[], right: InitialCharacterClassLevel[]) {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry.classId === right[index]?.classId && entry.level === right[index]?.level)
  )
}

function buildLevelPayload(characterId: number, classId: number, level: number): LevelPayload {
  return {
    character: { id: characterId },
    dndClass: { id: classId },
    level,
  }
}

function toHydratedClassRow(level: LevelRecord): HydratedCharacterClassRow | null {
  const characterId = normalizeNumber(level.id?.characterId ?? level.character?.id)
  const classId = normalizeNumber(level.id?.classId ?? level.dndClass?.id)
  const nextLevel = normalizeNumber(level.level)

  if (!characterId || !classId || !nextLevel || nextLevel < 1) {
    return null
  }

  return {
    characterId,
    classId,
    name: level.dndClass?.name,
    description: level.dndClass?.description ?? '',
    level: nextLevel,
    hitDice: level.dndClass?.hitDice,
    levelCharacteristics: normalizeLevelCharacteristics(level.dndClass?.levelCharacteristics),
  }
}

function normalizeClassLevelEntry(entry: InitialCharacterClassLevel | undefined): InitialCharacterClassLevel | null {
  if (!entry || !Number.isFinite(entry.classId) || entry.classId <= 0) {
    return null
  }

  return {
    classId: entry.classId,
    level: Number.isFinite(entry.level) && entry.level > 0 ? entry.level : 1,
  }
}

function sanitizeClassLevels(classLevels: InitialCharacterClassLevel[]): InitialCharacterClassLevel[] {
  const sanitized: InitialCharacterClassLevel[] = []

  classLevels.forEach((entry) => {
    if (sanitized.length >= 2) {
      return
    }

    const normalized = normalizeClassLevelEntry(entry)

    if (normalized) {
      sanitized.push(normalized)
    }
  })

  return sanitized
}

function buildCreateInitialClasses(classLevels: InitialCharacterClassLevel[]): CreateCharacterInitialClasses {
  if (classLevels.length === 1) {
    return [classLevels[0]]
  }

  return [classLevels[0], classLevels[1]]
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

  const primaryClassRow = normalizeClassLevelEntry(draft.classLevels[0])

  if (!primaryClassRow) {
    throw new Error('Character draft requires a primary class row')
  }

  const hasSecondClassRow = draft.classLevels[1] !== undefined
  const secondClassRow = normalizeClassLevelEntry(draft.classLevels[1])

  if (hasSecondClassRow && !secondClassRow) {
    throw new Error('Character draft second class row is malformed')
  }

  const validClassRows = draft.classLevels
    .map((entry) => normalizeClassLevelEntry(entry))
    .filter((entry): entry is InitialCharacterClassLevel => entry !== null)

  if (validClassRows.length > 2) {
    throw new Error('Character draft cannot include more than two initial classes')
  }

  const classLevels = sanitizeClassLevels(draft.classLevels)

  if (classLevels.length === 0) {
    throw new Error('Character draft requires at least one class')
  }

  const uniqueClassIds = new Set(classLevels.map((entry) => entry.classId))

  if (uniqueClassIds.size !== classLevels.length) {
    throw new Error('Character draft initial classes must be unique')
  }

  return {
    user: { id: draft.userId },
    campaign: { id: draft.campaignId },
    name: draft.name.trim(),
    characteristics: buildCharacteristicList(draft.characteristics, draft.details),
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
    initialClasses: buildCreateInitialClasses(classLevels),
  }
}

export function parseCharacteristicDetails(characteristics: string[]): ParsedCharacteristicDetails {
  const details = cloneCharacterDetails(DEFAULT_CHARACTER_DETAILS)
  const remainingCharacteristics: string[] = []

  characteristics.forEach((entry) => {
    const trimmedEntry = entry.trim()

    if (!trimmedEntry) {
      return
    }

    const match = getDetailLabelMatch(trimmedEntry)

    if (match && !details[match.key]) {
      details[match.key] = match.value
      return
    }

    remainingCharacteristics.push(trimmedEntry)
  })

  return {
    characteristics: remainingCharacteristics,
    details,
  }
}

export function hydrateCharacterDraft(character: Partial<Character>, levels: LevelRecord[] = []): CharacterDraft {
  const parsedCharacteristics = parseCharacteristicDetails(
    Array.isArray(character.characteristics) ? character.characteristics : [],
  )

  const stats = character.characterStats
  const filteredLevels = levels
    .map(toHydratedClassRow)
    .filter((entry): entry is HydratedCharacterClassRow => entry !== null)
    .filter((entry) => entry.characterId === character.id)

  return createCharacterDraft({
    userId: character.user?.id ?? null,
    campaignId: character.campaign?.id ?? null,
    name: character.name ?? '',
    characteristics: parsedCharacteristics.characteristics,
    alignment: character.alignment ?? '',
    background: character.background ?? '',
    raceId: character.race?.id ?? null,
    classLevels: filteredLevels.map(({ classId, level }) => ({ classId, level })),
    xp: stats?.xp ?? DEFAULT_CHARACTER_DRAFT.xp,
    proficiency: stats?.proficiency ?? DEFAULT_CHARACTER_DRAFT.proficiency,
    abilityScores: stats?.abilityScores ?? DEFAULT_CHARACTER_DRAFT.abilityScores,
    velocities: Array.isArray(stats?.velocities) ? stats.velocities : DEFAULT_CHARACTER_DRAFT.velocities,
    proficiencies: stats?.proficiencies ?? DEFAULT_CHARACTER_DRAFT.proficiencies,
    hp: stats?.hp ?? DEFAULT_CHARACTER_DRAFT.hp,
    details: parsedCharacteristics.details,
  })
}

export function hydrateCharacterEditData(character: Partial<Character>, levels: LevelRecord[] = []): HydratedCharacterEditData {
  const classRows = levels
    .map(toHydratedClassRow)
    .filter((entry): entry is HydratedCharacterClassRow => entry !== null)
    .filter((entry) => entry.characterId === character.id)

  return {
    characterId: character.id ?? 0,
    statsId: character.characterStats?.id ?? null,
    draft: hydrateCharacterDraft(character, levels),
    classRows,
  }
}

export function buildCharacterUpdatePlan(
  original: HydratedCharacterEditData,
  nextDraftInput: CharacterDraft,
): CharacterUpdatePlan {
  const originalDraft = createCharacterDraft(original.draft)
  const nextDraft = createCharacterDraft(nextDraftInput)
  const nextCharacteristics = buildCharacteristicList(nextDraft.characteristics, nextDraft.details)
  const originalCharacteristics = buildCharacteristicList(originalDraft.characteristics, originalDraft.details)

  const characterPatch: CharacterUpdatePayload = {}

  if (nextDraft.campaignId && nextDraft.campaignId !== originalDraft.campaignId) {
    characterPatch.campaign = { id: nextDraft.campaignId }
  }
  if (nextDraft.name.trim() !== originalDraft.name.trim()) {
    characterPatch.name = nextDraft.name.trim()
  }
  if (!areStringArraysEqual(nextCharacteristics, originalCharacteristics)) {
    characterPatch.characteristics = nextCharacteristics
  }
  if (nextDraft.alignment.trim() !== originalDraft.alignment.trim()) {
    characterPatch.alignment = nextDraft.alignment.trim()
  }
  if (nextDraft.background.trim() !== originalDraft.background.trim()) {
    characterPatch.background = nextDraft.background.trim()
  }
  if (nextDraft.raceId && nextDraft.raceId !== originalDraft.raceId) {
    characterPatch.race = { id: nextDraft.raceId }
  }

  const statsPatch: CharacterStatsUpdatePayload = {}

  if (nextDraft.xp !== originalDraft.xp) {
    statsPatch.xp = nextDraft.xp
  }
  if (nextDraft.proficiency !== originalDraft.proficiency) {
    statsPatch.proficiency = nextDraft.proficiency
  }
  if (!areRecordValuesEqual(nextDraft.abilityScores, originalDraft.abilityScores)) {
    statsPatch.abilityScores = cloneAbilityScores(nextDraft.abilityScores)
  }
  if (!areNumberArraysEqual(nextDraft.velocities, originalDraft.velocities)) {
    statsPatch.velocities = [...nextDraft.velocities]
  }
  if (!areRecordValuesEqual(nextDraft.proficiencies, originalDraft.proficiencies)) {
    statsPatch.proficiencies = sanitizeProficiencies(nextDraft.proficiencies)
  }
  if (nextDraft.hp !== originalDraft.hp) {
    statsPatch.hp = nextDraft.hp
  }

  const originalClassRows = original.classRows
  const nextClassLevels = sanitizeClassLevels(nextDraft.classLevels)
  const originalClassById = new Map(originalClassRows.map((row) => [row.classId, row]))
  const nextClassById = new Map(nextClassLevels.map((row) => [row.classId, row]))
  const classIds = Array.from(new Set([...originalClassById.keys(), ...nextClassById.keys()]))
  const classOperations = classIds.map((classId) => {
    const previous = originalClassById.get(classId)
    const next = nextClassById.get(classId)

    if (!previous && next) {
      return {
        type: 'create' as const,
        characterId: original.characterId,
        classId,
        nextLevel: next.level,
        payload: buildLevelPayload(original.characterId, classId, next.level),
      }
    }

    if (previous && !next) {
      return {
        type: 'delete' as const,
        characterId: original.characterId,
        classId,
        previousLevel: previous.level,
      }
    }

    if (previous && next && previous.level !== next.level) {
      return {
        type: 'update' as const,
        characterId: original.characterId,
        classId,
        previousLevel: previous.level,
        nextLevel: next.level,
        payload: buildLevelPayload(original.characterId, classId, next.level),
      }
    }

    return {
      type: 'noop' as const,
      characterId: original.characterId,
      classId,
      previousLevel: previous?.level ?? next?.level ?? 0,
      nextLevel: next?.level ?? previous?.level ?? 0,
    }
  })

  return {
    characterPatch: Object.keys(characterPatch).length > 0 ? characterPatch : null,
    statsPatch: Object.keys(statsPatch).length > 0 ? statsPatch : null,
    classOperations,
    hasChanges:
      Object.keys(characterPatch).length > 0 ||
      Object.keys(statsPatch).length > 0 ||
      classOperations.some((operation) => operation.type !== 'noop') ||
      !areCharacterDetailsEqual(nextDraft.details, originalDraft.details) ||
      !areClassLevelsEqual(nextClassLevels, sanitizeClassLevels(originalDraft.classLevels)),
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
