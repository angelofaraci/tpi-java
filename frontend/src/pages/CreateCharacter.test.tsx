import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    },
  },
}))

const catalogCampaigns = [
  { id: 2, name: 'Open Table', description: 'Shared campaign', privacy: false },
]

const catalogRaces = [
  { id: 7, name: 'Elf', description: 'Fey ancestry', racialFeats: ['Darkvision'] },
]

const catalogClasses = [
  {
    id: 8,
    name: 'Wizard',
    description: 'Arcane scholar',
    hitDice: 6,
    levelCharacteristics: { 1: 'Spellcasting' },
  },
]

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
    expect(screen.getByText('Initial class is required')).toBeInTheDocument()
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
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '3' } })
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

    await waitFor(() => {
      expect(api.characters.create).toHaveBeenCalledWith({
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
      })
    })

    expect(onSuccess).toHaveBeenCalledWith('Iria')
  })

  it('renders advanced sheet fields and updates the live snapshot', async () => {
    render(<CreateCharacter currentUserId={4} onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '2' } })
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
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    const errorMessages = await screen.findAllByText('Error: Error 500: Backend failed')
    expect(errorMessages[0]).toBeInTheDocument()
    expect(screen.getByLabelText('Character Name')).toHaveValue('Mira')
    expect(screen.getByLabelText('Alignment')).toHaveValue('Chaotic Good')
    expect(screen.getByLabelText('Background')).toHaveValue('Urchin')
    expect(screen.getByLabelText('Campaign')).toHaveValue('2')
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
