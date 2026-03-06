import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CHARACTER_DETAILS,
  DEFAULT_PROFICIENCIES,
  buildCreateCharacterPayload,
  createCharacterDraft,
  DEFAULT_ABILITY_SCORES,
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
  it('builds the backend payload from a draft and trims free text fields', () => {
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
    ).toThrow('Character draft requires at least one class')
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
