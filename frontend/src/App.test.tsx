import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { api } from './services/api'

vi.mock('./services/api', () => ({
  api: {
    auth: {
      me: vi.fn(),
    },
    characters: {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      remove: vi.fn(),
      update: vi.fn(),
    },
    levels: {
      create: vi.fn(),
      findAll: vi.fn(),
      remove: vi.fn(),
      update: vi.fn(),
    },
    characterStats: {
      update: vi.fn(),
    },
    campaigns: {
      create: vi.fn(),
      findMine: vi.fn(),
      findAll: vi.fn(),
    },
    races: {
      findAll: vi.fn(),
    },
    classes: {
      findAll: vi.fn(),
    },
  },
}))

describe('App create campaign flow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.setItem('token', 'test-token')

    vi.mocked(api.auth.me).mockResolvedValue({ id: 7 })
    vi.mocked(api.characters.findByUserId).mockResolvedValue([])
    vi.mocked(api.characters.findAll).mockResolvedValue([])
    vi.mocked(api.characters.findById).mockResolvedValue({
      id: 31,
      user: { id: 7 },
      campaign: { id: 3 },
      name: 'Iria',
      characterClasses: [],
      characteristics: ['Darkvision'],
      alignment: 'Neutral Good',
      background: 'Sage',
      characterStats: {
        proficiency: 2,
        abilityScores: {
          Strength: 10,
          Dexterity: 14,
          Constitution: 12,
          Intelligence: 16,
          Wisdom: 13,
          Charisma: 8,
        },
        proficiencies: {},
        velocities: [30],
        hp: 8,
      },
      race: { id: 7, name: 'Elf', description: 'Fey ancestry' },
    } as never)
    vi.mocked(api.characters.create).mockResolvedValue({ id: 31, name: 'Iria' } as never)
    vi.mocked(api.characters.remove).mockResolvedValue(null as never)
    vi.mocked(api.characters.update).mockResolvedValue({ id: 31, name: 'Iria Stormborn' } as never)
    vi.mocked(api.characterStats.update).mockResolvedValue({ id: 18, hp: 12 } as never)
    vi.mocked(api.levels.create).mockResolvedValue({} as never)
    vi.mocked(api.levels.findAll).mockResolvedValue([])
    vi.mocked(api.levels.remove).mockResolvedValue(null as never)
    vi.mocked(api.levels.update).mockResolvedValue({} as never)
    vi.mocked(api.campaigns.create).mockResolvedValue({
      id: 42,
      name: 'Stormwreck',
      description: 'Island quest',
      privacy: false,
    })
    vi.mocked(api.campaigns.findMine).mockResolvedValue([])
    vi.mocked(api.campaigns.findAll).mockResolvedValue([
      { id: 3, name: 'Open Table', description: 'Shared campaign', privacy: false },
    ])
    vi.mocked(api.races.findAll).mockResolvedValue([
      { id: 7, name: 'Elf', description: 'Fey ancestry', racialFeats: ['Darkvision'] },
    ])
    vi.mocked(api.classes.findAll).mockResolvedValue([
      {
        id: 8,
        name: 'Wizard',
        description: 'Arcane scholar',
        hitDice: 6,
        levelCharacteristics: { 1: 'Spellcasting' },
      },
    ])
  })

  it('opens the character creator from the home screen', async () => {
    const user = userEvent.setup()

    render(<App />)

    await screen.findByRole('button', { name: '+ Create Character' })
    await user.click(screen.getByRole('button', { name: '+ Create Character' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Create Character' })).toBeInTheDocument()
    expect(screen.getByLabelText('Campaign')).toBeInTheDocument()
  })

  it('returns home and refreshes characters after creating a character', async () => {
    vi.mocked(api.characters.findByUserId)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 31,
          name: 'Iria',
          level: 1,
          alignment: 'Neutral Good',
          race: { name: 'Elf' },
        },
      ] as never)

    render(<App />)

    await screen.findByRole('button', { name: '+ Create Character' })
    fireEvent.click(screen.getByRole('button', { name: '+ Create Character' }))
    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Campaign'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Iria' } })
    fireEvent.change(screen.getByLabelText('Alignment'), { target: { value: 'Neutral Good' } })
    fireEvent.change(screen.getByLabelText('Background'), { target: { value: 'Sage' } })
    fireEvent.change(screen.getByLabelText('Race'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Arcana'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Personality Traits'), { target: { value: 'Careful planner' } })
    fireEvent.change(screen.getByLabelText('Hit Points'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    expect(await screen.findByText('Character "Iria" created successfully.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Create Character' })).toBeInTheDocument()
    await waitFor(() => expect(api.characters.findByUserId).toHaveBeenCalledTimes(2))
    expect(api.auth.me).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Forge your first adventurer')).not.toBeInTheDocument()
  })

  it('opens edit mode from the character sheet and returns to the sheet when cancelled', async () => {
    vi.mocked(api.characters.findByUserId).mockResolvedValueOnce([
      {
        id: 31,
        name: 'Iria',
        level: 1,
        alignment: 'Neutral Good',
        race: { name: 'Elf' },
      },
    ] as never)

    render(<App />)

    expect(await screen.findByText('Iria')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'VIEW' }))
    expect(await screen.findByRole('button', { name: 'Edit Character' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Character' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Edit Character' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to Sheet' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to Sheet' }))

    expect(await screen.findByRole('button', { name: 'Edit Character' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Iria' })).toBeInTheDocument()
  })

  it('returns to the refreshed character sheet after saving an edit', async () => {
    vi.mocked(api.characters.findByUserId)
      .mockResolvedValueOnce([
        {
          id: 31,
          name: 'Iria',
          level: 1,
          alignment: 'Neutral Good',
          race: { name: 'Elf' },
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: 31,
          name: 'Iria Stormborn',
          level: 2,
          alignment: 'Neutral Good',
          race: { name: 'Elf' },
        },
      ] as never)

    vi.mocked(api.characters.findById)
      .mockResolvedValueOnce({
        id: 31,
        user: { id: 7 },
        campaign: { id: 3 },
        name: 'Iria',
        characterClasses: [],
        characteristics: ['Darkvision', 'Personality Trait: Careful planner'],
        alignment: 'Neutral Good',
        background: 'Sage',
        characterStats: {
          id: 18,
          proficiency: 2,
          xp: 0,
          abilityScores: {
            Strength: 10,
            Dexterity: 14,
            Constitution: 12,
            Intelligence: 16,
            Wisdom: 13,
            Charisma: 8,
          },
          proficiencies: {},
          velocities: [30],
          hp: 8,
        },
        race: { id: 7, name: 'Elf', description: 'Fey ancestry' },
      } as never)
      .mockResolvedValueOnce({
        id: 31,
        user: { id: 7 },
        campaign: { id: 3 },
        name: 'Iria Stormborn',
        characterClasses: [],
        characteristics: ['Darkvision', 'Personality Trait: Careful planner'],
        alignment: 'Neutral Good',
        background: 'Sage',
        characterStats: {
          id: 18,
          proficiency: 2,
          xp: 0,
          abilityScores: {
            Strength: 10,
            Dexterity: 14,
            Constitution: 12,
            Intelligence: 16,
            Wisdom: 13,
            Charisma: 8,
          },
          proficiencies: {},
          velocities: [30],
          hp: 12,
        },
        race: { id: 7, name: 'Elf', description: 'Fey ancestry' },
      } as never)
      .mockResolvedValueOnce({
        id: 31,
        user: { id: 7 },
        campaign: { id: 3 },
        name: 'Iria Stormborn',
        characterClasses: [],
        characteristics: ['Darkvision', 'Personality Trait: Careful planner'],
        alignment: 'Neutral Good',
        background: 'Sage',
        characterStats: {
          id: 18,
          proficiency: 2,
          xp: 0,
          abilityScores: {
            Strength: 10,
            Dexterity: 14,
            Constitution: 12,
            Intelligence: 16,
            Wisdom: 13,
            Charisma: 8,
          },
          proficiencies: {},
          velocities: [30],
          hp: 12,
        },
        race: { id: 7, name: 'Elf', description: 'Fey ancestry' },
      } as never)

    vi.mocked(api.levels.findAll)
      .mockResolvedValueOnce([
        {
          id: { characterId: 31, classId: 8 },
          character: { id: 31 },
          dndClass: {
            id: 8,
            name: 'Wizard',
            description: 'Arcane scholar',
            levelCharacteristics: { 1: 'Spellcasting' },
          },
          level: 1,
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: { characterId: 31, classId: 8 },
          character: { id: 31 },
          dndClass: {
            id: 8,
            name: 'Wizard',
            description: 'Arcane scholar',
            levelCharacteristics: { 1: 'Spellcasting', 2: 'Arcane Tradition' },
          },
          level: 2,
        },
      ] as never)

    render(<App />)

    expect(await screen.findByText('Iria')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'VIEW' }))
    expect(await screen.findByRole('button', { name: 'Edit Character' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Character' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Edit Character' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Iria Stormborn' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Hit Points'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Character "Iria Stormborn" updated successfully.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Iria Stormborn' })).toBeInTheDocument()
    expect(screen.getAllByText('Arcane scholar (Level 2)').length).toBeGreaterThan(0)
    await waitFor(() => expect(api.characters.findByUserId).toHaveBeenCalledTimes(2))
    expect(api.characters.update).toHaveBeenCalledWith(31, { name: 'Iria Stormborn' })
    expect(api.characterStats.update).toHaveBeenCalledWith(18, { hp: 12 })
    expect(api.levels.update).toHaveBeenCalledWith(31, 8, {
      character: { id: 31 },
      dndClass: { id: 8 },
      level: 2,
    })
  })

  it('returns home and shows success feedback after creating a campaign', async () => {
    const user = userEvent.setup()

    render(<App />)

    await screen.findByRole('button', { name: '+ Create Campaign' })
    await waitFor(() => expect(api.characters.findByUserId).toHaveBeenCalledWith(7))

    await user.click(screen.getByRole('button', { name: '+ Create Campaign' }))
    await user.type(screen.getByLabelText('Campaign Name'), 'Stormwreck')
    await user.type(screen.getByLabelText('Description'), 'Island quest')
    await user.click(screen.getByRole('button', { name: 'Create Campaign' }))

    expect(await screen.findByText('Campaign "Stormwreck" created successfully. You are now the DM.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Create Campaign' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Create Campaign' })).toBeInTheDocument()
  })

  it('refreshes owned campaigns after creation and ignores stale earlier responses', async () => {
    const user = userEvent.setup()
    let resolveInitialCampaigns: ((value: []) => void) | undefined

    vi.mocked(api.campaigns.findMine)
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveInitialCampaigns = resolve
        }),
      )
      .mockResolvedValueOnce([
        {
          id: 42,
          name: 'Stormwreck',
          description: 'Island quest',
          privacy: false,
          creationDate: '2025-11-29T00:00:00.000+00:00',
          playerCount: 1,
        },
      ])

    render(<App />)

    await screen.findByRole('button', { name: '+ Create Campaign' })
    await user.click(screen.getByRole('button', { name: '+ Create Campaign' }))
    await user.type(screen.getByLabelText('Campaign Name'), 'Stormwreck')
    await user.type(screen.getByLabelText('Description'), 'Island quest')
    await user.click(screen.getByRole('button', { name: 'Create Campaign' }))

    expect(await screen.findByText('Stormwreck')).toBeInTheDocument()
    expect(api.campaigns.findMine).toHaveBeenCalledTimes(2)

    resolveInitialCampaigns?.([])

    await waitFor(() => expect(screen.getByText('Stormwreck')).toBeInTheDocument())
    expect(screen.queryByText('You are not DM of any campaigns yet.')).not.toBeInTheDocument()
  })

  it('loads and renders owned campaigns on the home screen', async () => {
    vi.mocked(api.campaigns.findMine).mockResolvedValueOnce([
      {
        id: 11,
        name: 'Intro to Stormwreck Isle',
        description: 'Starter set adventure',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
        playerCount: 3,
      },
    ])

    render(<App />)

    expect(await screen.findByText('Intro to Stormwreck Isle')).toBeInTheDocument()
    expect(screen.getByText('Campaign Started 11/29/2025')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('VIEW CAMPAIGN')).toBeInTheDocument()
    await waitFor(() => expect(api.campaigns.findMine).toHaveBeenCalledTimes(1))
  })

  it('shows campaign loading and empty states separately from characters', async () => {
    let resolveCampaigns: ((value: []) => void) | undefined
    vi.mocked(api.campaigns.findMine).mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveCampaigns = resolve
      }),
    )

    render(<App />)

    expect(await screen.findByText('Loading campaigns...')).toBeInTheDocument()
    resolveCampaigns?.([])
    await waitFor(() => expect(screen.getByText('You are not DM of any campaigns yet.')).toBeInTheDocument())
  })

  it('shows a campaign error without affecting the characters section', async () => {
    vi.mocked(api.campaigns.findMine).mockRejectedValueOnce(new Error('Error 500: Backend failed'))

    render(<App />)

    await waitFor(() => expect(screen.getByText('Error 500: Backend failed')).toBeInTheDocument())
    expect(screen.getByText('Forge your first adventurer')).toBeInTheDocument()
  })

  it('deletes the selected character dynamically from its card action', async () => {
    vi.mocked(api.characters.findByUserId).mockResolvedValueOnce([
      {
        id: 31,
        name: 'Iria',
        level: 1,
        alignment: 'Neutral Good',
        race: { name: 'Elf' },
      },
      {
        id: 44,
        name: 'Borin',
        level: 2,
        alignment: 'Lawful Good',
        race: { name: 'Dwarf' },
      },
    ] as never)

    render(<App />)

    expect(await screen.findByText('Iria')).toBeInTheDocument()
    expect(screen.getByText('Borin')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Iria' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Delete Iria?' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete character' }))

    await waitFor(() => expect(api.characters.remove).toHaveBeenCalledWith(31))
    expect(screen.queryByText('Iria')).not.toBeInTheDocument()
    expect(screen.getByText('Borin')).toBeInTheDocument()
    expect(screen.getByText('Character "Iria" deleted successfully.')).toBeInTheDocument()
  })

  it('deletes the current character from the detail sheet using the shared confirmation flow', async () => {
    vi.mocked(api.characters.findByUserId).mockResolvedValueOnce([
      {
        id: 31,
        name: 'Iria',
        level: 1,
        alignment: 'Neutral Good',
        race: { name: 'Elf' },
      },
    ] as never)

    render(<App />)

    expect(await screen.findByText('Iria')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'VIEW' }))

    expect(await screen.findByRole('button', { name: 'Delete Character' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Character' }))
    expect(screen.getByRole('heading', { name: 'Delete Iria?' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete character' }))

    await waitFor(() => expect(api.characters.remove).toHaveBeenCalledWith(31))
    expect(await screen.findByText('Character "Iria" deleted successfully.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Create Character' })).toBeInTheDocument()
  })
})
