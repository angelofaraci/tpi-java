import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CHARACTER_DETAILS,
  DEFAULT_PROFICIENCIES,
  buildCreateCharacterPayload,
  buildCharacterUpdatePlan,
  createCharacterDraft,
  DEFAULT_ABILITY_SCORES,
  deriveProficiencyFromLevel,
  deriveSavingThrowDefaults,
  deriveXpFromLevel,
  resolveDrivingClass,
  hydrateCharacterDraft,
  parseCharacteristicDetails,
  getCharacterCatalogSelections,
} from './characterDraft'

describe('createCharacterDraft', () => {
  it('creates isolated default state for the upcoming character creator', () => {
    const draft = createCharacterDraft()

    expect(draft).toEqual({
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
    })

    draft.abilityScores.Strength = 18

    expect(createCharacterDraft().abilityScores.Strength).toBe(10)
  })
})

describe('buildCreateCharacterPayload', () => {
  it('builds the backend payload for one valid initial class and trims free text fields', () => {
    const payload = buildCreateCharacterPayload(
      createCharacterDraft({
        userId: 4,
        campaignId: 2,
        name: '  Iria  ',
        characteristics: [' Darkvision ', '  ', 'Arcane Recovery'],
        alignment: ' Neutral Good ',
        background: ' Sage ',
        raceId: 7,
        classLevels: [{ classId: 8, level: 0 }],
        xp: 250,
        proficiency: 3,
        abilityScores: {
          Strength: 10,
          Dexterity: 14,
          Constitution: 12,
          Intelligence: 16,
          Wisdom: 13,
          Charisma: 8,
        },
        velocities: [30],
        proficiencies: {
          ...DEFAULT_PROFICIENCIES,
          Arcana: 1,
          History: 2,
          Intelligence: 1,
          Wisdom: 1,
        },
        hp: 8,
        details: {
          personalityTraits: ' Curious and patient ',
          ideals: ' Knowledge should be shared ',
          bonds: ' Protect the academy archive ',
          flaws: ' Overthinks every risk ',
        },
      }),
    )

    expect(payload).toEqual({
      user: { id: 4 },
      campaign: { id: 2 },
      name: 'Iria',
      characteristics: [
        'Darkvision',
        'Arcane Recovery',
        'Personality Trait: Curious and patient',
        'Ideal: Knowledge should be shared',
        'Bond: Protect the academy archive',
        'Flaw: Overthinks every risk',
      ],
      alignment: 'Neutral Good',
      background: 'Sage',
      characterStats: {
        xp: 250,
        proficiency: 3,
        abilityScores: {
          Strength: 10,
          Dexterity: 14,
          Constitution: 12,
          Intelligence: 16,
          Wisdom: 13,
          Charisma: 8,
        },
        velocities: [30],
        proficiencies: {
          Acrobatics: 0,
          'Animal Handling': 0,
          Arcana: 1,
          Athletics: 0,
          Charisma: 0,
          Constitution: 0,
          Deception: 0,
          Dexterity: 0,
          History: 2,
          Insight: 0,
          Intelligence: 1,
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
          Strength: 0,
          Survival: 0,
          Wisdom: 1,
        },
        hp: 8,
      },
      race: { id: 7 },
      initialClasses: [{ classId: 8, level: 1 }],
    })
  })

  it('rejects drafts missing required linked entities', () => {
    expect(() => buildCreateCharacterPayload(createCharacterDraft())).toThrow('Character draft requires a userId')
    expect(() => buildCreateCharacterPayload(createCharacterDraft({ userId: 4 }))).toThrow(
      'Character draft requires a campaignId',
    )
    expect(() => buildCreateCharacterPayload(createCharacterDraft({ userId: 4, campaignId: 2 }))).toThrow(
      'Character draft requires a raceId',
    )
    expect(() =>
      buildCreateCharacterPayload(createCharacterDraft({ userId: 4, campaignId: 2, raceId: 7 })),
    ).toThrow('Character draft requires a primary class row')
  })

  it('keeps the proficiencies contract complete when custom values are omitted', () => {
    const payload = buildCreateCharacterPayload(
      createCharacterDraft({
        userId: 4,
        campaignId: 2,
        name: 'Iria',
        alignment: 'Neutral Good',
        background: 'Sage',
        raceId: 7,
        classLevels: [{ classId: 8, level: 3 }],
      }),
    )

    expect(payload.initialClasses).toEqual([{ classId: 8, level: 3 }])
    expect(payload.characterStats.proficiencies).toEqual(DEFAULT_PROFICIENCIES)
  })

  it('keeps both class rows when the draft defines a valid multiclass start', () => {
    const payload = buildCreateCharacterPayload(
      createCharacterDraft({
        userId: 4,
        campaignId: 2,
        name: 'Iria',
        alignment: 'Neutral Good',
        background: 'Sage',
        raceId: 7,
        classLevels: [
          { classId: 8, level: 3 },
          { classId: 5, level: 0 },
        ],
      }),
    )

    expect(payload.initialClasses).toEqual([
      { classId: 8, level: 3 },
      { classId: 5, level: 1 },
    ])
  })

  it('rejects duplicate initial class ids', () => {
    expect(() =>
      buildCreateCharacterPayload({
        ...createCharacterDraft({
          userId: 4,
          campaignId: 2,
          name: 'Iria',
          alignment: 'Neutral Good',
          background: 'Sage',
          raceId: 7,
        }),
        classLevels: [
          { classId: 8, level: 3 },
          { classId: 8, level: 1 },
        ],
      }),
    ).toThrow('Character draft initial classes must be unique')
  })

  it('rejects a malformed optional second class row', () => {
    expect(() =>
      buildCreateCharacterPayload({
        ...createCharacterDraft({
          userId: 4,
          campaignId: 2,
          name: 'Iria',
          alignment: 'Neutral Good',
          background: 'Sage',
          raceId: 7,
        }),
        classLevels: [
          { classId: 8, level: 3 },
          { classId: 0, level: 2 },
        ],
      }),
    ).toThrow('Character draft second class row is malformed')
  })

  it('rejects drafts that still contain more than two valid class rows', () => {
    expect(() =>
      buildCreateCharacterPayload({
        ...createCharacterDraft({
          userId: 4,
          campaignId: 2,
          name: 'Iria',
          alignment: 'Neutral Good',
          background: 'Sage',
          raceId: 7,
        }),
        classLevels: [
          { classId: 8, level: 3 },
          { classId: 5, level: 2 },
          { classId: 3, level: 1 },
        ],
      }),
    ).toThrow('Character draft cannot include more than two initial classes')
  })
})

describe('parseCharacteristicDetails', () => {
  it('extracts the first canonical roleplay detail entries and preserves the rest', () => {
    const result = parseCharacteristicDetails([
      'Darkvision',
      'Personality Trait: Curious and patient',
      'Ideal: Knowledge should be shared',
      'Flaw: Overthinks every risk',
      'Ideal: Duplicate canonical entry',
      'Trait: Non canonical alias',
      'Bond: Protect the archive',
    ])

    expect(result).toEqual({
      characteristics: ['Darkvision', 'Ideal: Duplicate canonical entry', 'Trait: Non canonical alias'],
      details: {
        personalityTraits: 'Curious and patient',
        ideals: 'Knowledge should be shared',
        bonds: 'Protect the archive',
        flaws: 'Overthinks every risk',
      },
    })
  })
})

describe('hydrateCharacterDraft', () => {
  it('hydrates edit draft fields from a fetched character and level rows', () => {
    const result = hydrateCharacterDraft(
      {
        id: 21,
        user: { id: 4, username: 'player-one' },
        campaign: { id: 2, name: 'Open Table' },
        name: 'Iria',
        characteristics: [
          'Darkvision',
          'Personality Trait: Curious and patient',
          'Ideal: Knowledge should be shared',
          'Bond: Protect the archive',
        ],
        alignment: 'Neutral Good',
        background: 'Sage',
        characterStats: {
          id: 14,
          xp: 250,
          proficiency: 3,
          abilityScores: {
            Strength: 10,
            Dexterity: 14,
            Constitution: 12,
            Intelligence: 16,
            Wisdom: 13,
            Charisma: 8,
          },
          velocities: [35],
          proficiencies: {
            ...DEFAULT_PROFICIENCIES,
            Arcana: 1,
            History: 1,
            Intelligence: 1,
          },
          hp: 18,
        },
        race: { id: 7, name: 'Elf', description: 'Fey ancestry' },
      },
      [
        {
          id: { characterId: 21, classId: 8 },
          character: { id: 21 },
          dndClass: { id: 8, name: 'Wizard', description: 'Arcane scholar' },
          level: 3,
        },
      ],
    )

    expect(result).toEqual({
      userId: 4,
      campaignId: 2,
      name: 'Iria',
      characteristics: ['Darkvision'],
      alignment: 'Neutral Good',
      background: 'Sage',
      raceId: 7,
      classLevels: [{ classId: 8, level: 3 }],
      xp: 250,
      proficiency: 3,
      abilityScores: {
        Strength: 10,
        Dexterity: 14,
        Constitution: 12,
        Intelligence: 16,
        Wisdom: 13,
        Charisma: 8,
      },
      velocities: [35],
      proficiencies: {
        ...DEFAULT_PROFICIENCIES,
        Arcana: 1,
        History: 1,
        Intelligence: 1,
      },
      hp: 18,
      details: {
        personalityTraits: 'Curious and patient',
        ideals: 'Knowledge should be shared',
        bonds: 'Protect the archive',
        flaws: '',
      },
    })
  })
})

describe('buildCharacterUpdatePlan', () => {
  it('preserves multiclass rows and emits no-op class operations when classes are unchanged', () => {
    const initialDraft = hydrateCharacterDraft(
      {
        id: 21,
        user: { id: 4 },
        campaign: { id: 2 },
        name: 'Iria',
        characteristics: ['Darkvision', 'Ideal: Knowledge should be shared'],
        alignment: 'Neutral Good',
        background: 'Sage',
        characterStats: {
          id: 14,
          xp: 250,
          proficiency: 3,
          abilityScores: {
            Strength: 10,
            Dexterity: 14,
            Constitution: 12,
            Intelligence: 16,
            Wisdom: 13,
            Charisma: 8,
          },
          velocities: [30],
          proficiencies: DEFAULT_PROFICIENCIES,
          hp: 18,
        },
        race: { id: 7, name: 'Elf', description: 'Fey ancestry' },
      },
      [
        {
          id: { characterId: 21, classId: 8 },
          character: { id: 21 },
          dndClass: { id: 8, name: 'Wizard', description: 'Arcane scholar' },
          level: 3,
        },
        {
          id: { characterId: 21, classId: 5 },
          character: { id: 21 },
          dndClass: { id: 5, name: 'Fighter', description: 'Martial expert' },
          level: 2,
        },
      ],
    )

    const plan = buildCharacterUpdatePlan(
      {
        characterId: 21,
        statsId: 14,
        draft: initialDraft,
        classRows: [
          { characterId: 21, classId: 8, name: 'Wizard', description: 'Arcane scholar', level: 3 },
          { characterId: 21, classId: 5, name: 'Fighter', description: 'Martial expert', level: 2 },
        ],
      },
      createCharacterDraft({
        ...initialDraft,
        classLevels: [
          { classId: 8, level: 3 },
          { classId: 5, level: 2 },
        ],
      }),
    )

    expect(plan.characterPatch).toBeNull()
    expect(plan.statsPatch).toBeNull()
    expect(plan.classOperations).toEqual([
      { type: 'noop', characterId: 21, classId: 8, previousLevel: 3, nextLevel: 3 },
      { type: 'noop', characterId: 21, classId: 5, previousLevel: 2, nextLevel: 2 },
    ])
    expect(plan.hasChanges).toBe(false)
  })
})

describe('getCharacterCatalogSelections', () => {
  it('derives the selected catalog records from draft ids', () => {
    const result = getCharacterCatalogSelections(
      {
        campaignId: 2,
        raceId: 7,
        classLevels: [
          { classId: 8, level: 1 },
          { classId: 99, level: 3 },
        ],
      },
      {
        campaigns: [
          { id: 2, name: 'Open Table', description: 'Shared campaign', privacy: false },
        ],
        races: [
          { id: 7, name: 'Elf', description: 'Fey ancestry', racialFeats: ['Darkvision'] },
        ],
        classes: [
          {
            id: 8,
            name: 'Wizard',
            description: 'Arcane scholar',
            hitDice: 6,
            levelCharacteristics: { 1: 'Spellcasting' },
          },
        ],
      },
    )

    expect(result).toEqual({
      selectedCampaign: { id: 2, name: 'Open Table', description: 'Shared campaign', privacy: false },
      selectedRace: { id: 7, name: 'Elf', description: 'Fey ancestry', racialFeats: ['Darkvision'] },
      selectedClasses: [
        {
          id: 8,
          name: 'Wizard',
          description: 'Arcane scholar',
          hitDice: 6,
          levelCharacteristics: { 1: 'Spellcasting' },
          level: 1,
        },
      ],
    })
  })
})

describe('resolveDrivingClass', () => {
  it('chooses the highest-level class and breaks ties by first selected', () => {
    expect(resolveDrivingClass([
      { classId: 8, level: 4 },
      { classId: 5, level: 4 },
    ])).toEqual({ classId: 8, level: 4 })

    expect(resolveDrivingClass([
      { classId: 8, level: 2 },
      { classId: 5, level: 5 },
    ])).toEqual({ classId: 5, level: 5 })
  })
})

describe('deriveProficiencyFromLevel', () => {
  it('maps levels to expected 5e proficiency bands', () => {
    expect(deriveProficiencyFromLevel(1)).toBe(2)
    expect(deriveProficiencyFromLevel(5)).toBe(3)
    expect(deriveProficiencyFromLevel(9)).toBe(4)
    expect(deriveProficiencyFromLevel(13)).toBe(5)
    expect(deriveProficiencyFromLevel(17)).toBe(6)
  })
})

describe('deriveXpFromLevel', () => {
  it('returns canonical XP thresholds and clamps invalid levels', () => {
    expect(deriveXpFromLevel(1)).toBe(0)
    expect(deriveXpFromLevel(3)).toBe(900)
    expect(deriveXpFromLevel(20)).toBe(355000)
    expect(deriveXpFromLevel(0)).toBe(0)
    expect(deriveXpFromLevel(99)).toBe(355000)
  })
})

describe('deriveSavingThrowDefaults', () => {
  it('returns defaults for driving class and keeps tie-break on first class', () => {
    const classes = [
      { id: 8, name: 'Wizard', description: 'Arcane scholar', hitDice: 6, levelCharacteristics: { 1: 'Spellcasting' }, savingThrows: ['Intelligence', 'Wisdom'] },
      { id: 5, name: 'Fighter', description: 'Martial expert', hitDice: 10, levelCharacteristics: { 1: 'Fighting Style' }, savingThrows: ['Strength', 'Constitution'] },
    ]

    expect(deriveSavingThrowDefaults([
      { classId: 8, level: 4 },
      { classId: 5, level: 4 },
    ], classes)).toEqual({
      Strength: 0,
      Dexterity: 0,
      Constitution: 0,
      Intelligence: 1,
      Wisdom: 1,
      Charisma: 0,
    })
  })

  it('reads savingThrows from API-provided class data: Barbarian gets Strength and Constitution', () => {
    const classes = [
      { id: 1, name: 'Barbarian', description: 'Primal warrior', hitDice: 12, levelCharacteristics: {}, savingThrows: ['Strength', 'Constitution'] },
    ]

    expect(deriveSavingThrowDefaults([{ classId: 1, level: 3 }], classes)).toEqual({
      Strength: 1,
      Dexterity: 0,
      Constitution: 1,
      Intelligence: 0,
      Wisdom: 0,
      Charisma: 0,
    })
  })

  it('returns all zeros when class savingThrows is empty (graceful degradation)', () => {
    const classes = [
      { id: 2, name: 'TestClass', description: 'No throws', hitDice: 8, levelCharacteristics: {}, savingThrows: [] },
    ]

    expect(deriveSavingThrowDefaults([{ classId: 2, level: 1 }], classes)).toEqual({
      Strength: 0,
      Dexterity: 0,
      Constitution: 0,
      Intelligence: 0,
      Wisdom: 0,
      Charisma: 0,
    })
  })

  it('returns all zeros when class savingThrows is undefined (null safety)', () => {
    const classes = [
      { id: 3, name: 'TestClass2', description: 'No throws', hitDice: 8, levelCharacteristics: {} },
    ]

    expect(deriveSavingThrowDefaults([{ classId: 3, level: 1 }], classes)).toEqual({
      Strength: 0,
      Dexterity: 0,
      Constitution: 0,
      Intelligence: 0,
      Wisdom: 0,
      Charisma: 0,
    })
  })
})
