import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterCatalogClassOption, CreateCharacterPayload } from '../interfaces/character'
import { api } from '../services/api'
import { DEFAULT_PROFICIENCIES } from '../utils/characterDraft'
import { CreateCharacter } from './CreateCharacter'

vi.mock('../services/api', () => ({
  api: {
    campaigns: {
      findAll: vi.fn(),
    },
    races: {
      findAll: vi.fn(),
    },
    classes: {
      findAll: vi.fn(),
    },
    characters: {
      create: vi.fn(),
      update: vi.fn(),
    },
    characterStats: {
      update: vi.fn(),
    },
    levels: {
      create: vi.fn(),
      remove: vi.fn(),
      update: vi.fn(),
    },
  },
}))

const catalogCampaigns = [
  { id: 2, name: 'Open Table', description: 'Shared campaign', privacy: false },
]

const catalogRaces = [
  { id: 7, name: 'Elf', description: 'Fey ancestry', racialFeats: ['Darkvision'] },
]

const catalogClasses: CharacterCatalogClassOption[] = [
  {
    id: 8,
    name: 'Wizard',
    description: 'Arcane scholar',
    hitDice: 6,
    levelCharacteristics: { 1: 'Spellcasting', 2: 'Arcane Tradition', 3: 'Arcane Recovery' },
  },
  {
    id: 5,
    name: 'Fighter',
    description: 'Martial expert',
    hitDice: 10,
    levelCharacteristics: { 1: 'Fighting Style', 2: 'Second Wind' },
  },
]

function fillRequiredCreateFields() {
  fireEvent.change(screen.getByLabelText('Campaign'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Iria' } })
  fireEvent.change(screen.getByLabelText('Alignment'), { target: { value: 'Neutral Good' } })
  fireEvent.change(screen.getByLabelText('Background'), { target: { value: 'Sage' } })
  fireEvent.change(screen.getByLabelText('Race'), { target: { value: '7' } })
  fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
  fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '3' } })
}

function buildSingleClassEditData() {
  return {
    characterId: 21,
    statsId: 14,
    classRows: [
      {
        characterId: 21,
        classId: 8,
        name: 'Wizard',
        description: 'Arcane scholar',
        level: 3,
        levelCharacteristics: { 1: 'Spellcasting', 2: 'Arcane Tradition' },
      },
    ],
    draft: {
      userId: 4,
      campaignId: 2,
      name: 'Iria',
      characteristics: ['Darkvision', 'Keen Senses'],
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
        History: 2,
        Intelligence: 1,
      },
      hp: 18,
      details: {
        personalityTraits: 'Curious and patient',
        ideals: 'Knowledge should be shared',
        bonds: 'Protect the archive',
        flaws: 'Overthinks every risk',
      },
    },
  }
}

describe('CreateCharacter', () => {
  const onCancel = vi.fn()
  const onLogout = vi.fn()
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.campaigns.findAll).mockResolvedValue(catalogCampaigns)
    vi.mocked(api.races.findAll).mockResolvedValue(catalogRaces)
    vi.mocked(api.classes.findAll).mockResolvedValue(catalogClasses)
  })

  it('shows required validation when core fields are blank', async () => {
    const user = userEvent.setup()

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    await user.click(screen.getByRole('button', { name: 'Create Character' }))

    expect(await screen.findByText('Campaign is required')).toBeInTheDocument()
    expect(screen.getByText('Character name is required')).toBeInTheDocument()
    expect(screen.getByText('Alignment is required')).toBeInTheDocument()
    expect(screen.getByText('Background is required')).toBeInTheDocument()
    expect(screen.getByText('Race is required')).toBeInTheDocument()
    expect(screen.getByText('Primary class is required')).toBeInTheDocument()
    expect(api.characters.create).not.toHaveBeenCalled()
  })

  it('submits the typed payload after loading the creation catalogs', async () => {
    vi.mocked(api.characters.create).mockResolvedValueOnce({
      id: 21,
      name: 'Iria',
    } as never)

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    expect(await screen.findByText('Open Table')).toBeInTheDocument()
    expect(screen.getByLabelText('Campaign Code (Coming Soon)')).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Campaign'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: ' Iria ' } })
    fireEvent.change(screen.getByLabelText('Alignment'), { target: { value: ' Neutral Good ' } })
    fireEvent.change(screen.getByLabelText('Background'), { target: { value: ' Sage ' } })
    fireEvent.change(screen.getByLabelText('Race'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Hit Points'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Proficiency Bonus'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Characteristics'), { target: { value: 'Darkvision\nArcane Recovery' } })
    fireEvent.blur(screen.getByLabelText('Characteristics'))
    fireEvent.change(screen.getByLabelText('Dexterity', { selector: '#ability-Dexterity' }), { target: { value: '14' } })
    fireEvent.change(screen.getByLabelText('Intelligence', { selector: '#ability-Intelligence' }), { target: { value: '16' } })
    fireEvent.change(screen.getByLabelText('Personality Traits'), { target: { value: ' Curious and patient ' } })
    fireEvent.change(screen.getByLabelText('Ideals'), { target: { value: ' Knowledge should be shared ' } })
    fireEvent.change(screen.getByLabelText('Bonds'), { target: { value: ' Protect the academy archive ' } })
    fireEvent.change(screen.getByLabelText('Flaws'), { target: { value: ' Overthinks every risk ' } })
    fireEvent.change(screen.getByLabelText('Arcana'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('History'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wisdom saving throw' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    await waitFor(() => expect(api.characters.create).toHaveBeenCalledTimes(1))

    expect(vi.mocked(api.characters.create).mock.calls[0]?.[0]).toEqual({
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
        xp: 0,
        proficiency: 3,
        abilityScores: {
          Strength: 10,
          Dexterity: 14,
          Constitution: 10,
          Intelligence: 16,
          Wisdom: 10,
          Charisma: 10,
        },
        velocities: [30],
        proficiencies: {
          ...DEFAULT_PROFICIENCIES,
          Arcana: 1,
          History: 2,
          Wisdom: 1,
        },
        hp: 8,
      },
      race: { id: 7 },
      initialClasses: [{ classId: 8, level: 3 }],
    } satisfies CreateCharacterPayload)

    expect(onSuccess).toHaveBeenCalledWith({
      characterId: 21,
      characterName: 'Iria',
    })
  })

  it('rejects out-of-range class levels in create mode by clamping them before submit', async () => {
    vi.mocked(api.characters.create).mockResolvedValueOnce({
      id: 21,
      name: 'Iria',
    } as never)

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })

    const primaryLevelInput = screen.getByLabelText('Primary Level')
    const secondaryLevelInputName = 'Secondary Level'

    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(primaryLevelInput, { target: { value: '0' } })
    expect(primaryLevelInput).toHaveValue(1)

    fillRequiredCreateFields()
    fireEvent.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.change(screen.getByLabelText('Secondary Class'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(secondaryLevelInputName), { target: { value: '99' } })
    expect(screen.getByLabelText(secondaryLevelInputName)).toHaveValue(20)
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    await waitFor(() => expect(api.characters.create).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.characters.create).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        initialClasses: [
          { classId: 8, level: 3 },
          { classId: 5, level: 20 },
        ],
      } satisfies Partial<CreateCharacterPayload>),
    )
  })

  it('renders advanced sheet fields and updates the live snapshot', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Arcana'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Intelligence saving throw' }))
    fireEvent.change(screen.getByLabelText('Personality Traits'), { target: { value: 'Strategic thinker' } })

    expect(screen.getByText((_, element) => element?.textContent === 'Level 2')).toBeInTheDocument()
    expect(screen.getByText('Spellcasting')).toBeInTheDocument()
    expect(screen.getByText('1 skill selections')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === '1 saving throw')).toBeInTheDocument()
    expect(screen.getByText('Personality Trait: Strategic thinker')).toBeInTheDocument()
  })

  it('preserves the filled draft and shows submit feedback when creation fails', async () => {
    vi.mocked(api.characters.create).mockRejectedValueOnce(new Error('Error 500: Backend failed'))

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Campaign'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Mira' } })
    fireEvent.change(screen.getByLabelText('Alignment'), { target: { value: 'Chaotic Good' } })
    fireEvent.change(screen.getByLabelText('Background'), { target: { value: 'Urchin' } })
    fireEvent.change(screen.getByLabelText('Race'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    const errorMessages = await screen.findAllByText('Error: Error 500: Backend failed')
    expect(errorMessages[0]).toBeInTheDocument()
    expect(screen.getByLabelText('Character Name')).toHaveValue('Mira')
    expect(screen.getByLabelText('Alignment')).toHaveValue('Chaotic Good')
    expect(screen.getByLabelText('Background')).toHaveValue('Urchin')
    expect(screen.getByLabelText('Campaign')).toHaveValue('2')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('hydrates the remaining edit fields including canonical details, proficiencies, and ability scores', async () => {
    render(
      <CreateCharacter
        currentUserId={4}
        mode="edit"
        initialEditData={buildSingleClassEditData()}
        onCancel={onCancel}
        onLogout={onLogout}
        onSuccess={onSuccess}
      />,
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Edit Character' })).toBeInTheDocument()
    expect(screen.getByLabelText('Character Name')).toHaveValue('Iria')
    expect(screen.getByLabelText('Campaign')).toHaveValue('2')
    expect(screen.getByLabelText('Race')).toHaveValue('7')
    expect(screen.getByLabelText('Class')).toHaveValue('8')
    expect(screen.getByLabelText('Level')).toHaveValue(3)
    expect(screen.getByLabelText('Hit Points')).toHaveValue(18)
    expect(screen.getByLabelText('Speed')).toHaveValue(35)
    expect(screen.getByLabelText('XP')).toHaveValue(250)
    expect(screen.getByLabelText('Proficiency Bonus')).toHaveValue(3)
    expect(screen.getByLabelText('Strength', { selector: '#ability-Strength' })).toHaveValue(10)
    expect(screen.getByLabelText('Dexterity', { selector: '#ability-Dexterity' })).toHaveValue(14)
    expect(screen.getByLabelText('Constitution', { selector: '#ability-Constitution' })).toHaveValue(12)
    expect(screen.getByLabelText('Intelligence', { selector: '#ability-Intelligence' })).toHaveValue(16)
    expect(screen.getByLabelText('Wisdom', { selector: '#ability-Wisdom' })).toHaveValue(13)
    expect(screen.getByLabelText('Charisma', { selector: '#ability-Charisma' })).toHaveValue(8)
    expect(screen.getByRole('checkbox', { name: 'Intelligence saving throw' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Wisdom saving throw' })).not.toBeChecked()
    expect(screen.getByLabelText('Arcana')).toHaveValue('1')
    expect(screen.getByLabelText('History')).toHaveValue('2')
    expect(screen.getByLabelText('Personality Traits')).toHaveValue('Curious and patient')
    expect(screen.getByLabelText('Ideals')).toHaveValue('Knowledge should be shared')
    expect(screen.getByLabelText('Bonds')).toHaveValue('Protect the archive')
    expect(screen.getByLabelText('Flaws')).toHaveValue('Overthinks every risk')
    expect(screen.getByText('Darkvision x')).toBeInTheDocument()
    expect(screen.getByText('Keen Senses x')).toBeInTheDocument()
  })

  it('adds an optional second class row in create mode', async () => {
    const user = userEvent.setup()

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    expect(screen.queryByLabelText('Secondary Class')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Secondary Class' }))

    expect(screen.getByLabelText('Secondary Class')).toBeInTheDocument()
    expect(screen.getByLabelText('Secondary Level')).toHaveValue(1)
    expect(screen.getByRole('button', { name: 'Remove Secondary Class' })).toBeInTheDocument()
  })

  it('blocks duplicate classes across both create rows', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fillRequiredCreateFields()
    fireEvent.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.change(screen.getByLabelText('Secondary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Secondary Level'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    expect(await screen.findByText('Primary and secondary classes must be different')).toBeInTheDocument()
    expect(api.characters.create).not.toHaveBeenCalled()
  })

  it('blocks an incomplete optional second class row', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fillRequiredCreateFields()
    fireEvent.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    expect(await screen.findByText('Secondary class row is incomplete')).toBeInTheDocument()
    expect(api.characters.create).not.toHaveBeenCalled()
  })

  it('submits exactly two class rows in create mode', async () => {
    vi.mocked(api.characters.create).mockResolvedValueOnce({
      id: 21,
      name: 'Iria',
    } as never)

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fillRequiredCreateFields()
    fireEvent.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.change(screen.getByLabelText('Secondary Class'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Secondary Level'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    await waitFor(() => {
      expect(api.characters.create).toHaveBeenCalledWith(
        expect.objectContaining({
          initialClasses: [
            { classId: 8, level: 3 },
            { classId: 5, level: 2 },
          ],
        } satisfies Partial<CreateCharacterPayload>),
      )
    })
  })

  it('previews both classes and the combined level in create mode', async () => {
    const user = userEvent.setup()

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '3' } })
    await user.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.change(screen.getByLabelText('Secondary Class'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Secondary Level'), { target: { value: '2' } })

    expect(screen.getByText((_, element) => element?.textContent === 'Level 5')).toBeInTheDocument()
    expect(screen.getByText('Wizard - Level 3')).toBeInTheDocument()
    expect(screen.getByText('Fighter - Level 2')).toBeInTheDocument()
    expect(screen.getByText('Arcane Recovery')).toBeInTheDocument()
    expect(screen.getByText('Second Wind')).toBeInTheDocument()
  })

  it('preserves the edit draft and shows submit feedback when an update call fails', async () => {
    vi.mocked(api.characters.update).mockResolvedValueOnce({ id: 21, name: 'Iria Stormborn' } as never)
    vi.mocked(api.characterStats.update).mockRejectedValueOnce(new Error('Error 500: Backend failed'))

    render(
      <CreateCharacter
        currentUserId={4}
        mode="edit"
        initialEditData={buildSingleClassEditData()}
        onCancel={onCancel}
        onLogout={onLogout}
        onSuccess={onSuccess}
      />,
    )

    await screen.findByRole('heading', { level: 2, name: 'Edit Character' })
    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Iria Stormborn' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Hit Points'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Error: Error 500: Backend failed')).toBeInTheDocument()
    expect(screen.getByLabelText('Character Name')).toHaveValue('Iria Stormborn')
    expect(screen.getByLabelText('Level')).toHaveValue(4)
    expect(screen.getByLabelText('Hit Points')).toHaveValue(20)
    expect(api.characters.update).toHaveBeenCalledWith(21, { name: 'Iria Stormborn' })
    expect(api.characterStats.update).toHaveBeenCalledWith(14, { hp: 20 })
    expect(api.levels.update).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('hydrates edit mode fields and updates a single-class character', async () => {
    vi.mocked(api.characters.update).mockResolvedValueOnce({ id: 21, name: 'Iria Stormborn' } as never)
    vi.mocked(api.characterStats.update).mockResolvedValueOnce({ id: 14, hp: 20 } as never)
    vi.mocked(api.levels.update).mockResolvedValueOnce({} as never)

    render(
      <CreateCharacter
        currentUserId={4}
        mode="edit"
        initialEditData={buildSingleClassEditData()}
        onCancel={onCancel}
        onLogout={onLogout}
        onSuccess={onSuccess}
      />,
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Edit Character' })).toBeInTheDocument()
    expect(screen.getByLabelText('Character Name')).toHaveValue('Iria')
    expect(screen.getByLabelText('Campaign')).toHaveValue('2')
    expect(screen.getByLabelText('Race')).toHaveValue('7')
    expect(screen.getByLabelText('Class')).toHaveValue('8')
    expect(screen.getByLabelText('Level')).toHaveValue(3)
    expect(screen.getByLabelText('Hit Points')).toHaveValue(18)
    expect(screen.getByLabelText('Speed')).toHaveValue(35)
    expect(screen.getByLabelText('XP')).toHaveValue(250)
    expect(screen.getByLabelText('Proficiency Bonus')).toHaveValue(3)
    expect(screen.getByLabelText('Personality Traits')).toHaveValue('Curious and patient')
    expect(screen.getByText('Darkvision x')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Iria Stormborn' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Hit Points'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(api.characters.update).toHaveBeenCalledWith(21, { name: 'Iria Stormborn' })
      expect(api.characterStats.update).toHaveBeenCalledWith(14, { hp: 20 })
      expect(api.levels.update).toHaveBeenCalledWith(21, 8, {
        character: { id: 21 },
        dndClass: { id: 8 },
        level: 4,
      })
    })

    expect(onSuccess).toHaveBeenCalledWith({
      characterId: 21,
      characterName: 'Iria Stormborn',
    })
  })

  it('locks existing multiclass rows in edit mode and preserves them on submit', async () => {
    vi.mocked(api.characters.update).mockResolvedValueOnce({ id: 21, name: 'Iria' } as never)
    vi.mocked(api.characterStats.update).mockResolvedValueOnce({ id: 14, xp: 300 } as never)

    render(
      <CreateCharacter
        currentUserId={4}
        mode="edit"
        initialEditData={{
          characterId: 21,
          statsId: 14,
          classRows: [
            {
              characterId: 21,
              classId: 8,
              name: 'Wizard',
              description: 'Arcane scholar',
              level: 3,
            },
            {
              characterId: 21,
              classId: 5,
              name: 'Fighter',
              description: 'Martial expert',
              level: 2,
            },
          ],
          draft: {
            userId: 4,
            campaignId: 2,
            name: 'Iria',
            characteristics: ['Darkvision'],
            alignment: 'Neutral Good',
            background: 'Sage',
            raceId: 7,
            classLevels: [
              { classId: 8, level: 3 },
              { classId: 5, level: 2 },
            ],
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
            details: {
              personalityTraits: '',
              ideals: '',
              bonds: '',
              flaws: '',
            },
          },
        }}
        onCancel={onCancel}
        onLogout={onLogout}
        onSuccess={onSuccess}
      />,
    )

    expect(await screen.findByText('Multiclass rows are locked during editing.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Wizard')).toBeDisabled()
    expect(screen.getByDisplayValue('Fighter')).toBeDisabled()
    expect(screen.getByLabelText('Level', { selector: '#character-level-0' })).toBeDisabled()
    expect(screen.getByLabelText('Level', { selector: '#character-level-1' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('XP'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(api.characterStats.update).toHaveBeenCalledWith(14, { xp: 300 }))
    expect(api.levels.update).not.toHaveBeenCalled()
    expect(api.levels.create).not.toHaveBeenCalled()
    expect(api.levels.remove).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith({
      characterId: 21,
      characterName: 'Iria',
    })
  })
})
