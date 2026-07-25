import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CANONICAL_ALIGNMENTS, type CharacterCatalogClassOption, type CreateCharacterPayload } from '../interfaces/character'
import { api } from '../services/api'
import { DEFAULT_PROFICIENCIES } from '../utils/characterDraft'
import { CreateCharacter } from './CreateCharacter'

vi.mock('../services/api', () => ({
  api: {
    campaigns: {
      findAll: vi.fn(),
      findByCode: vi.fn(),
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
      uploadPortrait: vi.fn(),
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
    savingThrows: ['Intelligence', 'Wisdom'],
  },
  {
    id: 5,
    name: 'Fighter',
    description: 'Martial expert',
    hitDice: 10,
    levelCharacteristics: { 1: 'Fighting Style', 2: 'Second Wind' },
    savingThrows: ['Strength', 'Constitution'],
  },
]

async function fillRequiredCreateFields() {
  fireEvent.change(screen.getByLabelText('Campaign Code'), { target: { value: 'OPEN-TABL' } })
  await vi.runAllTimersAsync()
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
    vi.useRealTimers()
    vi.mocked(api.campaigns.findAll).mockResolvedValue(catalogCampaigns)
    vi.mocked(api.campaigns.findByCode).mockResolvedValue({
      id: 2,
      name: 'Open Table',
      description: 'Shared campaign',
      privacy: false,
    } as never)
    vi.mocked(api.races.findAll).mockResolvedValue(catalogRaces)
    vi.mocked(api.classes.findAll).mockResolvedValue(catalogClasses)
  })

  afterEach(() => {
    vi.useRealTimers()
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

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    expect(screen.getByLabelText('Campaign Code')).toBeInTheDocument()

    // Activate fake timers only for the debounce window, then restore immediately
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Campaign Code'), { target: { value: 'OPEN-TABL' } })
    await vi.advanceTimersByTimeAsync(700) // advance past the 600ms debounce
    vi.useRealTimers()

    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: ' Iria ' } })
    fireEvent.change(screen.getByLabelText('Alignment'), { target: { value: 'Neutral Good' } })
    fireEvent.change(screen.getByLabelText('Background'), { target: { value: ' Sage ' } })
    fireEvent.change(screen.getByLabelText('Race'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Hit Points'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Characteristics'), { target: { value: 'Darkvision\nArcane Recovery' } })
    fireEvent.blur(screen.getByLabelText('Characteristics'))
    fireEvent.change(screen.getByLabelText('Dexterity', { selector: '#ability-Dexterity' }), { target: { value: '14' } })
    fireEvent.change(screen.getByLabelText('Intelligence', { selector: '#ability-Intelligence' }), { target: { value: '16' } })
    fireEvent.change(screen.getByLabelText('Personality Traits'), { target: { value: ' Curious and patient ' } })
    fireEvent.change(screen.getByLabelText('Ideals'), { target: { value: ' Knowledge should be shared ' } })
    fireEvent.change(screen.getByLabelText('Bonds'), { target: { value: ' Protect the academy archive ' } })
    fireEvent.change(screen.getByLabelText('Flaws'), { target: { value: ' Overthinks every risk ' } })
    fireEvent.click(screen.getByLabelText('Arcana'))
    fireEvent.click(screen.getByLabelText('History'))
    fireEvent.click(document.getElementById('skill-History-expertise')!)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wisdom saving throw' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    await waitFor(() => expect(api.characters.create).toHaveBeenCalledTimes(1), { timeout: 10000 })

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
        xp: 900,
        proficiency: 2,
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
          Intelligence: 1,
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
  }, 15000)

  it('rejects out-of-range class levels in create mode by clamping them before submit', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

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

    await fillRequiredCreateFields()
    fireEvent.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.change(screen.getByLabelText('Secondary Class'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(secondaryLevelInputName), { target: { value: '99' } })
    expect(screen.getByLabelText(secondaryLevelInputName)).toHaveValue(20)
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    vi.useRealTimers()

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

  it('renders advanced sheet fields and tracks derived summary counters', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '2' } })
    fireEvent.click(screen.getByLabelText('Arcana'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Intelligence saving throw' }))
    fireEvent.change(screen.getByLabelText('Personality Traits'), { target: { value: 'Strategic thinker' } })

    expect(screen.getByText((_, element) => element?.textContent === 'Level 2')).toBeInTheDocument()
    expect(screen.getAllByText('Saving Throw Proficiency').length).toBeGreaterThan(0)
    expect(screen.getByText('Skill Proficiencies')).toBeInTheDocument()
  })

  it('preserves the filled draft and shows submit feedback when creation fails', async () => {
    vi.mocked(api.characters.create).mockRejectedValueOnce(new Error('Error 500: Backend failed'))

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    // Enable fake timers only after the initial async render settles — findByRole's
    // internal polling relies on real timers, so activating fake timers earlier can
    // let it resolve before the creation catalogs (races/classes) finish loading.
    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fireEvent.change(screen.getByLabelText('Campaign Code'), { target: { value: 'OPEN-TABL' } })
    await vi.runAllTimersAsync()
    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Mira' } })
    fireEvent.change(screen.getByLabelText('Alignment'), { target: { value: 'Chaotic Good' } })
    fireEvent.change(screen.getByLabelText('Background'), { target: { value: 'Urchin' } })
    fireEvent.change(screen.getByLabelText('Race'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    vi.useRealTimers()

    const errorMessages = await screen.findAllByText('Error: Error 500: Backend failed')
    expect(errorMessages[0]).toBeInTheDocument()
    expect(screen.getByLabelText('Character Name')).toHaveValue('Mira')
    expect(screen.getByLabelText('Alignment')).toHaveValue('Chaotic Good')
    expect(screen.getByLabelText('Background')).toHaveValue('Urchin')
    expect(screen.getByLabelText('Campaign Code')).toHaveValue('OPEN-TABL')
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
    // Flush all pending effects (e.g. auto saving-throw defaults applied after catalog loads)
    await act(async () => {})
    expect(screen.getByLabelText('Character Name')).toHaveValue('Iria')
    expect(screen.getByLabelText('Race')).toHaveValue('7')
    expect(screen.getByLabelText('Class')).toHaveValue('8')
    expect(screen.getByLabelText('Level')).toHaveValue(3)
    expect(screen.getByLabelText('Hit Points')).toHaveValue(18)
    expect(screen.getByLabelText('Speed')).toHaveValue(35)
    expect(screen.getByLabelText('XP')).toHaveValue(250)
    expect(screen.getByLabelText('Proficiency Bonus')).toHaveValue(2)
    expect(screen.getByLabelText('Strength', { selector: '#ability-Strength' })).toHaveValue(10)
    expect(screen.getByLabelText('Dexterity', { selector: '#ability-Dexterity' })).toHaveValue(14)
    expect(screen.getByLabelText('Constitution', { selector: '#ability-Constitution' })).toHaveValue(12)
    expect(screen.getByLabelText('Intelligence', { selector: '#ability-Intelligence' })).toHaveValue(16)
    expect(screen.getByLabelText('Wisdom', { selector: '#ability-Wisdom' })).toHaveValue(13)
    expect(screen.getByLabelText('Charisma', { selector: '#ability-Charisma' })).toHaveValue(8)
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Intelligence saving throw' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Wisdom saving throw' })).toBeChecked()
    }, { timeout: 3000 })
    expect(screen.getByLabelText('Arcana')).toBeChecked()
    expect(screen.getByLabelText('History')).toBeChecked()
    expect(document.getElementById('skill-History-expertise')).toBeChecked()
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
    vi.useFakeTimers({ shouldAdvanceTime: true })

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    await fillRequiredCreateFields()
    fireEvent.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.change(screen.getByLabelText('Secondary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Secondary Level'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    vi.useRealTimers()

    expect(await screen.findByText('Primary and secondary classes must be different')).toBeInTheDocument()
    expect(api.characters.create).not.toHaveBeenCalled()
  })

  it('blocks an incomplete optional second class row', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    await fillRequiredCreateFields()
    fireEvent.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    vi.useRealTimers()

    expect(await screen.findByText('Secondary class row is incomplete')).toBeInTheDocument()
    expect(api.characters.create).not.toHaveBeenCalled()
  })

  it('submits exactly two class rows in create mode', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    vi.mocked(api.characters.create).mockResolvedValueOnce({
      id: 21,
      name: 'Iria',
    } as never)

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    await fillRequiredCreateFields()
    fireEvent.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.change(screen.getByLabelText('Secondary Class'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Secondary Level'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    vi.useRealTimers()

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

  it('shows combined level summary in create mode with multiclass rows', async () => {
    const user = userEvent.setup()

    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '3' } })
    await user.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.change(screen.getByLabelText('Secondary Class'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Secondary Level'), { target: { value: '2' } })

    expect(screen.getByText((_, element) => element?.textContent === 'Level 5')).toBeInTheDocument()
    expect(screen.getByLabelText('Primary Class')).toHaveValue('8')
    expect(screen.getByLabelText('Secondary Class')).toHaveValue('5')
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
    expect(api.characterStats.update).toHaveBeenCalledWith(14, expect.objectContaining({ hp: 20 }))
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
    expect(screen.getByLabelText('Race')).toHaveValue('7')
    expect(screen.getByLabelText('Class')).toHaveValue('8')
    expect(screen.getByLabelText('Level')).toHaveValue(3)
    expect(screen.getByLabelText('Hit Points')).toHaveValue(18)
    expect(screen.getByLabelText('Speed')).toHaveValue(35)
    expect(screen.getByLabelText('XP')).toHaveValue(250)
    expect(screen.getByLabelText('Proficiency Bonus')).toHaveValue(2)
    expect(screen.getByLabelText('Personality Traits')).toHaveValue('Curious and patient')
    expect(screen.getByText('Darkvision x')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Iria Stormborn' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Hit Points'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(api.characters.update).toHaveBeenCalledWith(21, { name: 'Iria Stormborn' })
      expect(api.characterStats.update).toHaveBeenCalledWith(14, expect.objectContaining({ hp: 20 }))
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

    await waitFor(() => expect(api.characterStats.update).toHaveBeenCalledWith(14, expect.objectContaining({ xp: 300 })))
    expect(api.levels.update).not.toHaveBeenCalled()
    expect(api.levels.create).not.toHaveBeenCalled()
    expect(api.levels.remove).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith({
      characterId: 21,
      characterName: 'Iria',
    })
  })

  it('renders alignment as canonical picklist with exact options', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    const alignmentSelect = screen.getByLabelText('Alignment')
    expect(alignmentSelect.tagName).toBe('SELECT')

    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toContain('Select alignment')
    CANONICAL_ALIGNMENTS.forEach((alignment) => {
      expect(options).toContain(alignment)
    })
  })

  it('keeps proficiency bonus non-editable and auto-derived from highest class level', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    const proficiencyInput = screen.getByLabelText('Proficiency Bonus')
    expect(proficiencyInput).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '6' } })
    expect(proficiencyInput).toHaveValue(3)
  })

  it('sets defaults using first selected class when highest level tie occurs', async () => {
    const user = userEvent.setup()
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '4' } })
    await user.click(screen.getByRole('button', { name: 'Add Secondary Class' }))
    fireEvent.change(screen.getByLabelText('Secondary Class'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Secondary Level'), { target: { value: '4' } })

    expect(screen.getByRole('checkbox', { name: 'Intelligence saving throw' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Wisdom saving throw' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Strength saving throw' })).not.toBeChecked()
  })

  it('allows manual saving throw override after auto defaults', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })

    const intelligenceSavingThrow = screen.getByRole('checkbox', { name: 'Intelligence saving throw' })
    expect(intelligenceSavingThrow).toBeChecked()

    fireEvent.click(intelligenceSavingThrow)
    expect(intelligenceSavingThrow).not.toBeChecked()
  })

  it('auto-sets XP to the minimum for the current total level in create mode', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '3' } })

    const xpInput = await screen.findByLabelText('XP')
    // level 3 → minXp = 900
    expect(xpInput).toHaveValue(900)

    // manually raise XP above the minimum — should not be overwritten
    fireEvent.change(xpInput, { target: { value: '1200' } })
    expect(xpInput).toHaveValue(1200)

    // raise level to 4: minXp becomes 2700, but current xp (1200) < 2700 → adjusts to minimum
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '4' } })
    await waitFor(() => expect(xpInput).toHaveValue(2700))
  })

  it('does not overwrite XP when it already meets or exceeds the minimum for the new level', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '3' } })

    const xpInput = await screen.findByLabelText('XP')
    // level 3 → minXp = 900; raise to 5000 (well above level 4's 2700)
    fireEvent.change(xpInput, { target: { value: '5000' } })
    expect(xpInput).toHaveValue(5000)

    // raise level to 4: minXp becomes 2700; 5000 >= 2700 → keep 5000
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '4' } })
    expect(xpInput).toHaveValue(5000)
  })

  it('clamps ability scores to 20', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    const dexterityInput = screen.getByLabelText('Dexterity', { selector: '#ability-Dexterity' })

    fireEvent.change(dexterityInput, { target: { value: '25' } })
    expect(dexterityInput).toHaveValue(20)
  })

  it('does not render sheet snapshot panel', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    expect(screen.queryByRole('heading', { level: 3, name: 'Sheet Snapshot' })).not.toBeInTheDocument()
  })

  // ─── Portrait drag-and-drop zone ───────────────────────────────────────────

  it('renders the portrait drag-and-drop zone in create mode', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    expect(screen.getByText('Drag & drop or click to select')).toBeInTheDocument()
  })

  it('does NOT render the portrait drag-and-drop zone in edit mode', async () => {
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
    expect(screen.queryByText('Drag & drop or click to select')).not.toBeInTheDocument()
  })

  it('shows MIME validation error and does not call uploadPortrait when a non-image file is dropped', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })

    const dropZoneText = screen.getByText('Drag & drop or click to select')
    const dropZone = dropZoneText.closest('div[style]') as HTMLElement

    const file = new File(['some content'], 'document.txt', { type: 'text/plain' })

    // jsdom doesn't support dataTransfer natively — use Object.defineProperty on the event
    const dropEvent = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [file] },
    })
    dropZone.dispatchEvent(dropEvent)

    expect(await screen.findByText('Only JPEG, PNG, WebP, and GIF images are accepted.')).toBeInTheDocument()
    expect(api.characters.uploadPortrait).not.toHaveBeenCalled()
  })
})
