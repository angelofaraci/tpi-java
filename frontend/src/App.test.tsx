import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { api } from './services/api'
import type { User } from './interfaces/user'
import type { Campaign } from './interfaces/campaign'

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
      findById: vi.fn(),
      findMine: vi.fn(),
      findAsPlayer: vi.fn(),
      findAll: vi.fn(),
      findAllPublic: vi.fn(),
      findByCode: vi.fn(),
      remove: vi.fn(),
    },
    races: {
      findAll: vi.fn(),
    },
    classes: {
      findAll: vi.fn(),
    },
    demo: {
      campaigns: vi.fn(),
      characters: vi.fn(),
      characterById: vi.fn(),
      campaignById: vi.fn(),
    },
  },
}))

describe('App create campaign flow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.setItem('token', 'test-token')

    vi.mocked(api.auth.me).mockResolvedValue({ id: 7 } as User)
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
    vi.mocked(api.campaigns.findAsPlayer).mockResolvedValue([])
    vi.mocked(api.campaigns.findAll).mockResolvedValue([
      { id: 3, name: 'Open Table', description: 'Shared campaign', privacy: false },
    ])
    vi.mocked(api.campaigns.findAllPublic).mockResolvedValue([])
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

    await screen.findByRole('button', { name: '+ New character' })
    await user.click(screen.getByRole('button', { name: '+ New character' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Create Character' })).toBeInTheDocument()
    expect(screen.getByLabelText('Campaign Code')).toBeInTheDocument()
  })

  it('returns home and refreshes characters after creating a character', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    vi.mocked(api.campaigns.findByCode).mockResolvedValueOnce({
      id: 3,
      name: 'Open Table',
      description: 'Shared campaign',
      privacy: false,
    } as never)

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

    await screen.findByRole('button', { name: '+ New character' })
    fireEvent.click(screen.getByRole('button', { name: '+ New character' }))
    await screen.findByRole('heading', { level: 2, name: 'Create Character' })
    fireEvent.change(screen.getByLabelText('Campaign Code'), { target: { value: 'OPEN-TABL' } })
    await vi.runAllTimersAsync()
    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Iria' } })
    fireEvent.change(screen.getByLabelText('Alignment'), { target: { value: 'Neutral Good' } })
    fireEvent.change(screen.getByLabelText('Background'), { target: { value: 'Sage' } })
    fireEvent.change(screen.getByLabelText('Race'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Primary Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Primary Level'), { target: { value: '2' } })
    fireEvent.click(screen.getByLabelText('Arcana'))
    fireEvent.change(screen.getByLabelText('Personality Traits'), { target: { value: 'Careful planner' } })
    fireEvent.change(screen.getByLabelText('Hit Points'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }))

    vi.useRealTimers()

    expect(await screen.findByText('Character "Iria" created successfully.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New character' })).toBeInTheDocument()
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

    fireEvent.click(screen.getByText('Iria'))
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
      // The home's own mount-time fetch (App.tsx's `loadLevels`, feeding the
      // CharacterCard level badge) consumes the first queued value; the next
      // two are Characters.tsx's own pre-edit and post-edit fetches.
      .mockResolvedValueOnce([])
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
      // App.tsx's post-save `loadLevels()` refresh (keeps the Home level badge/sort in sync
      // without requiring a page reload).
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

    fireEvent.click(screen.getByText('Iria'))
    expect(await screen.findByRole('button', { name: 'Edit Character' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Character' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Edit Character' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Character Name'), { target: { value: 'Iria Stormborn' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Hit Points'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Character "Iria Stormborn" updated successfully.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Iria Stormborn' })).toBeInTheDocument()
    expect(screen.getAllByText((_, element) => element?.textContent === 'Wizard (Level 2)').length).toBeGreaterThan(0)
    await waitFor(() => expect(api.characters.findByUserId).toHaveBeenCalledTimes(2))
    expect(api.characters.update).toHaveBeenCalledWith(31, { name: 'Iria Stormborn' })
    expect(api.characterStats.update).toHaveBeenCalledWith(18, expect.objectContaining({ hp: 12 }))
    expect(api.levels.update).toHaveBeenCalledWith(31, 8, {
      character: { id: 31 },
      dndClass: { id: 8 },
      level: 2,
    })
  })

  it('returns home and shows success feedback after creating a campaign', async () => {
    const user = userEvent.setup()

    render(<App />)

    await screen.findByRole('button', { name: '+ New campaign' })
    await waitFor(() => expect(api.characters.findByUserId).toHaveBeenCalledWith(7))

    await user.click(screen.getByRole('button', { name: '+ New campaign' }))
    await user.type(screen.getByLabelText('Campaign Name'), 'Stormwreck')
    await user.type(screen.getByLabelText('Description'), 'Island quest')
    await user.click(screen.getByRole('button', { name: 'Create Campaign' }))

    expect(await screen.findByText('Campaign "Stormwreck" created successfully. You are now the DM.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Create Campaign' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New campaign' })).toBeInTheDocument()
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
        },
      ])

    render(<App />)

    await screen.findByRole('button', { name: '+ New campaign' })
    await user.click(screen.getByRole('button', { name: '+ New campaign' }))
    await user.type(screen.getByLabelText('Campaign Name'), 'Stormwreck')
    await user.type(screen.getByLabelText('Description'), 'Island quest')
    await user.click(screen.getByRole('button', { name: 'Create Campaign' }))

    expect(await screen.findByText('Stormwreck')).toBeInTheDocument()
    expect(api.campaigns.findMine).toHaveBeenCalledTimes(2)

    resolveInitialCampaigns?.([])

    await waitFor(() => expect(screen.getByText('Stormwreck')).toBeInTheDocument())
    expect(screen.queryByText('No tables yet')).not.toBeInTheDocument()
  })

  it('loads and renders owned campaigns on the home screen', async () => {
    vi.mocked(api.campaigns.findMine).mockResolvedValueOnce([
      {
        id: 11,
        name: 'Intro to Stormwreck Isle',
        description: 'Starter set adventure',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
      },
    ])

    render(<App />)

    expect(await screen.findByText('Intro to Stormwreck Isle')).toBeInTheDocument()
    expect(screen.getByText('DM')).toBeInTheDocument()
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

    expect(await screen.findAllByTestId('rail-card-skeleton')).toHaveLength(3)
    resolveCampaigns?.([])
    await waitFor(() => expect(screen.getByText('No tables yet')).toBeInTheDocument())
  })

  it('shows the join code and copy button on the owned campaign card', async () => {
    vi.mocked(api.campaigns.findMine).mockResolvedValueOnce([
      {
        id: 11,
        name: 'Intro to Stormwreck Isle',
        description: 'Starter set adventure',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
        joinCode: 'AB12-CD34',
      },
    ])

    render(<App />)

    expect(await screen.findByText('AB12-CD34')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
  })

  it('shows the join code dialog with a copy button instead of a Copy Code text button after campaign creation', async () => {
    const user = userEvent.setup()

    vi.mocked(api.campaigns.findMine).mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 42,
        name: 'Stormwreck',
        description: 'Island quest',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
        joinCode: 'XY99-ZZ00',
      },
    ])

    render(<App />)

    await screen.findByRole('button', { name: '+ New campaign' })
    await user.click(screen.getByRole('button', { name: '+ New campaign' }))
    await user.type(screen.getByLabelText('Campaign Name'), 'Stormwreck')
    await user.type(screen.getByLabelText('Description'), 'Island quest')
    await user.click(screen.getByRole('button', { name: 'Create Campaign' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('XY99-ZZ00')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy Code' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Got it!' })).toBeInTheDocument()
  })

  it('groups player campaigns by campaignId showing one card per campaign', async () => {
    vi.mocked(api.campaigns.findAsPlayer).mockResolvedValueOnce([
      {
        campaignId: 5,
        campaignName: 'Lost Mines',
        campaignDescription: 'Classic starter',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
        characterId: 10,
        characterName: 'Iria',
      },
      {
        campaignId: 5,
        campaignName: 'Lost Mines',
        campaignDescription: 'Classic starter',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
        characterId: 11,
        characterName: 'Borin',
      },
    ])

    render(<App />)

    // One campaign name, not two — the dense rail card shows a single hero slot
    // per campaign (the first character), not every teammate (design.md
    // CampaignRailCardProps.RailCampaign.heroName is a single field, not a list).
    expect(await screen.findAllByText('Lost Mines')).toHaveLength(1)
    expect(screen.getByText('Your hero: Iria')).toBeInTheDocument()
  })

  it('shows each campaign once even when the player has multiple characters in different campaigns', async () => {
    vi.mocked(api.campaigns.findAsPlayer).mockResolvedValueOnce([
      {
        campaignId: 5,
        campaignName: 'Lost Mines',
        campaignDescription: 'Classic starter',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
        characterId: 10,
        characterName: 'Iria',
      },
      {
        campaignId: 7,
        campaignName: 'Stormwreck Isle',
        campaignDescription: 'Island quest',
        privacy: false,
        creationDate: '2025-12-01T00:00:00.000+00:00',
        characterId: 12,
        characterName: 'Zara',
      },
    ])

    render(<App />)

    expect(await screen.findByText('Lost Mines')).toBeInTheDocument()
    expect(screen.getByText('Stormwreck Isle')).toBeInTheDocument()
    expect(screen.getByText('Your hero: Iria')).toBeInTheDocument()
    expect(screen.getByText('Your hero: Zara')).toBeInTheDocument()
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

    fireEvent.click(screen.getByTitle('More actions for Iria'))
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

    fireEvent.click(screen.getByText('Iria'))

    expect(await screen.findByRole('button', { name: 'Delete Character' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Character' }))
    expect(screen.getByRole('heading', { name: 'Delete Iria?' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete character' }))

    await waitFor(() => expect(api.characters.remove).toHaveBeenCalledWith(31))
    expect(await screen.findByText('Character "Iria" deleted successfully.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New character' })).toBeInTheDocument()
  })
})

describe('App home navigation and persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.setItem('token', 'test-token')
    localStorage.removeItem('home.sort')

    vi.mocked(api.auth.me).mockResolvedValue({ id: 7, username: 'pancho' } as User)
    vi.mocked(api.characters.findByUserId).mockResolvedValue([
      {
        id: 31,
        user: { id: 7 },
        campaign: { id: 3 },
        name: 'Iria',
        characterClasses: [],
        characteristics: [],
        alignment: 'Neutral Good',
        background: 'Sage',
        characterStats: {
          proficiency: 2,
          abilityScores: { Strength: 10, Dexterity: 14, Constitution: 12, Intelligence: 16, Wisdom: 13, Charisma: 8 },
          proficiencies: {},
          velocities: [30],
          hp: 8,
        },
        race: { id: 7, name: 'Elf', description: 'Fey ancestry' },
      } as never,
    ])
    vi.mocked(api.characters.findAll).mockResolvedValue([])
    vi.mocked(api.characters.findById).mockResolvedValue({
      id: 31,
      user: { id: 7 },
      campaign: { id: 3 },
      name: 'Iria',
      characterClasses: [],
      characteristics: [],
      alignment: 'Neutral Good',
      background: 'Sage',
      characterStats: {
        proficiency: 2,
        abilityScores: { Strength: 10, Dexterity: 14, Constitution: 12, Intelligence: 16, Wisdom: 13, Charisma: 8 },
        proficiencies: {},
        velocities: [30],
        hp: 8,
      },
      race: { id: 7, name: 'Elf', description: 'Fey ancestry' },
    } as never)
    vi.mocked(api.characters.remove).mockResolvedValue(null as never)
    vi.mocked(api.levels.findAll).mockResolvedValue([])
    vi.mocked(api.classes.findAll).mockResolvedValue([])
    vi.mocked(api.races.findAll).mockResolvedValue([])
    vi.mocked(api.campaigns.findMine).mockResolvedValue([
      { id: 11, name: 'Intro to Stormwreck Isle', description: 'Starter set adventure', privacy: false },
    ])
    vi.mocked(api.campaigns.findAsPlayer).mockResolvedValue([])
    vi.mocked(api.campaigns.findAllPublic).mockResolvedValue([])
    vi.mocked(api.campaigns.findById).mockResolvedValue({
      id: 11,
      name: 'Intro to Stormwreck Isle',
      description: 'Starter set adventure',
      privacy: false,
      players: [],
      characters: [],
    } as never)
  })

  it('renders public campaigns from GET /campaigns and navigates to the read-only view on click', async () => {
    vi.mocked(api.campaigns.findAllPublic).mockResolvedValue([
      { id: 99, name: 'Open Table', description: 'Drop-in one-shot', privacy: false },
    ])
    vi.mocked(api.campaigns.findById).mockImplementation(async (id: number) =>
      id === 99
        ? ({ id: 99, name: 'Open Table', description: 'Drop-in one-shot', privacy: false, players: [], characters: [] } as never)
        : ({
            id: 11,
            name: 'Intro to Stormwreck Isle',
            description: 'Starter set adventure',
            privacy: false,
            players: [],
            characters: [],
          } as never),
    )

    render(<App />)

    expect(await screen.findByText('PUBLIC CAMPAIGNS')).toBeInTheDocument()
    expect(screen.getByText('Open Table')).toBeInTheDocument()
    expect(screen.getByText('READ-ONLY')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View →' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Open Table' })).toBeInTheDocument()
  })

  it('persists sort to localStorage and restores it after a character-sheet round trip', async () => {
    render(<App />)

    expect(await screen.findByText('Iria')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Sort characters'), { target: { value: 'level' } })

    expect(localStorage.getItem('home.sort')).toBe('level')

    fireEvent.click(screen.getByRole('button', { name: 'Intro to Stormwreck Isle' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Back to Home' }))

    await screen.findByText('Forge another adventurer')
    expect(screen.getByLabelText('Sort characters')).toHaveValue('level')
  })

  it('navigates to the character sheet with the selected id when a CharacterCard is clicked', async () => {
    render(<App />)

    fireEvent.click(await screen.findByText('Iria'))

    expect(await screen.findByRole('heading', { level: 2, name: 'Iria' })).toBeInTheDocument()
  })

  it('navigates to view-campaign with the selected id when the rail campaign name is clicked', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()
    await waitFor(() => expect(api.campaigns.findById).toHaveBeenCalledWith(11))
  })

  it('opens character creation with the campaign code pre-filled after a successful "Join a table"', async () => {
    vi.mocked(api.campaigns.findByCode).mockResolvedValue({
      id: 11,
      name: 'Intro to Stormwreck Isle',
      description: 'Starter set adventure',
      privacy: false,
    } as never)

    render(<App />)

    await screen.findByText('Iria')

    fireEvent.change(screen.getByLabelText('Join a table by code'), { target: { value: 'AB12-CD34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Join' }))

    await waitFor(() => expect(api.campaigns.findByCode).toHaveBeenCalledWith('AB12-CD34'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Create Character' })).toBeInTheDocument()
    await act(async () => {})
    expect(screen.getByLabelText('Campaign Code')).toHaveValue('AB12-CD34')
  })
})

describe('App view campaign flow', () => {
  const mockCampaignDetail = {
    id: 11,
    name: 'Intro to Stormwreck Isle',
    description: 'Starter set adventure',
    privacy: false,
    creationDate: '2025-11-29T00:00:00.000+00:00',
    players: [
      { id: 3, username: 'alice', email: 'alice@example.com' },
      { id: 4, username: 'bob', email: 'bob@example.com' },
    ],
    characters: [
      { id: 31 },
      { id: 44 },
    ],
  }

  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.setItem('token', 'test-token')

    vi.mocked(api.auth.me).mockResolvedValue({ id: 7 } as User)
    vi.mocked(api.characters.findByUserId).mockResolvedValue([])
    vi.mocked(api.characters.findAll).mockResolvedValue([])
    vi.mocked(api.characters.findById).mockResolvedValue({} as never)
    vi.mocked(api.characters.create).mockResolvedValue({} as never)
    vi.mocked(api.characters.remove).mockResolvedValue(null as never)
    vi.mocked(api.characters.update).mockResolvedValue({} as never)
    vi.mocked(api.characterStats.update).mockResolvedValue({} as never)
    vi.mocked(api.levels.create).mockResolvedValue({} as never)
    vi.mocked(api.levels.findAll).mockResolvedValue([])
    vi.mocked(api.levels.remove).mockResolvedValue(null as never)
    vi.mocked(api.levels.update).mockResolvedValue({} as never)
    vi.mocked(api.campaigns.create).mockResolvedValue({} as never)
    vi.mocked(api.campaigns.findMine).mockResolvedValue([
      {
        id: 11,
        name: 'Intro to Stormwreck Isle',
        description: 'Starter set adventure',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
      },
    ])
    vi.mocked(api.campaigns.findAll).mockResolvedValue([])
    vi.mocked(api.campaigns.findAllPublic).mockResolvedValue([])
    vi.mocked(api.campaigns.findById).mockResolvedValue(mockCampaignDetail as never)
    vi.mocked(api.campaigns.remove).mockResolvedValue(null as never)
    vi.mocked(api.races.findAll).mockResolvedValue([])
    vi.mocked(api.classes.findAll).mockResolvedValue([])
  })

  it('navigates to the campaign detail view when VIEW CAMPAIGN is clicked', async () => {
    render(<App />)

    expect(await screen.findByText('Intro to Stormwreck Isle')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Intro to Stormwreck Isle' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()
    await waitFor(() => expect(api.campaigns.findById).toHaveBeenCalledWith(11))
  })

  it('renders campaign name, privacy badge, date, description, and stats in the detail view', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()
    expect(screen.getByText('Public')).toBeInTheDocument()
    expect(screen.getByText('November 29, 2025')).toBeInTheDocument()
    expect(screen.getByText('Starter set adventure')).toBeInTheDocument()
    expect(screen.getByText('PLAYERS')).toBeInTheDocument()
    expect(screen.getByText('CHARACTERS')).toBeInTheDocument()
  })

  it('renders the players list in the campaign detail view', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))

    expect(await screen.findByText('alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('renders the characters list in the campaign detail view', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))

    expect(await screen.findByText('Character #31')).toBeInTheDocument()
    expect(screen.getByText('Character #44')).toBeInTheDocument()
  })

  it('shows empty state messages when there are no players or characters', async () => {
    vi.mocked(api.campaigns.findById).mockResolvedValueOnce({
      ...mockCampaignDetail,
      players: [],
      characters: [],
    } as never)

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))

    expect(await screen.findByText('No players have joined this campaign yet.')).toBeInTheDocument()
    expect(screen.getByText('No characters assigned to this campaign yet.')).toBeInTheDocument()
  })

  it('shows loading state while fetching campaign details', async () => {
    let resolveCampaign: ((value: Campaign | PromiseLike<Campaign>) => void) | undefined
    vi.mocked(api.campaigns.findById).mockImplementationOnce(
      () => new Promise((resolve) => { resolveCampaign = resolve }),
    )

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))

    expect(await screen.findByText('Loading campaign...')).toBeInTheDocument()

    resolveCampaign?.(mockCampaignDetail)
    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()
  })

  it('shows an error state when fetching campaign details fails', async () => {
    vi.mocked(api.campaigns.findById).mockRejectedValueOnce(new Error('Error 503: Service unavailable'))

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))

    expect(await screen.findByText('Error: Error 503: Service unavailable')).toBeInTheDocument()
  })

  it('returns to home when Back to Home is clicked from campaign detail', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Back to Home' }))

    expect(await screen.findByRole('button', { name: '+ New campaign' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).not.toBeInTheDocument()
  })

  it('opens the delete campaign confirmation dialog from the campaign detail view', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))
    expect(await screen.findByRole('button', { name: 'Delete Campaign' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Campaign' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Delete Intro to Stormwreck Isle?' })).toBeInTheDocument()
  })

  it('closes the delete campaign dialog when Cancel is clicked', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))
    expect(await screen.findByRole('button', { name: 'Delete Campaign' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Campaign' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()
  })

  it('confirms delete campaign, returns to home, and shows success feedback', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Intro to Stormwreck Isle' }))
    expect(await screen.findByRole('button', { name: 'Delete Campaign' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Campaign' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete campaign' }))

    await waitFor(() => expect(api.campaigns.remove).toHaveBeenCalledWith(11))
    expect(await screen.findByRole('button', { name: '+ New campaign' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).not.toBeInTheDocument()
    expect(screen.getByText('Campaign "Intro to Stormwreck Isle" deleted successfully.')).toBeInTheDocument()
  })

  it('removes the deleted campaign card from the home list after deletion', async () => {
    render(<App />)

    expect(await screen.findByText('Intro to Stormwreck Isle')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Intro to Stormwreck Isle' }))
    expect(await screen.findByRole('button', { name: 'Delete Campaign' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Campaign' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete campaign' }))

    await waitFor(() => expect(api.campaigns.remove).toHaveBeenCalledWith(11))
    await screen.findByRole('button', { name: '+ New campaign' })
    expect(screen.queryByText('Intro to Stormwreck Isle')).not.toBeInTheDocument()
  })
})

describe('App demo landing (unauthenticated)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('renders the demo landing instead of the login form when there is no token', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: /log in.*sign up/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Username:')).not.toBeInTheDocument()
  })

  it('switches to the login form when the demo CTA is clicked', async () => {
    render(<App />)

    const ctaButton = await screen.findByRole('button', { name: /log in.*sign up/i })
    fireEvent.click(ctaButton)

    expect(await screen.findByLabelText('Username:')).toBeInTheDocument()
  })
})

describe('App logout returns to demo landing', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.setItem('token', 'test-token')

    vi.mocked(api.auth.me).mockResolvedValue({ id: 7 } as User)
    vi.mocked(api.characters.findByUserId).mockResolvedValue([])
    vi.mocked(api.characters.findAll).mockResolvedValue([])
    vi.mocked(api.campaigns.findMine).mockResolvedValue([])
    vi.mocked(api.campaigns.findAsPlayer).mockResolvedValue([])
    vi.mocked(api.campaigns.findAllPublic).mockResolvedValue([])
  })

  it('shows the demo landing (not the login form) after logging out', async () => {
    render(<App />)

    await screen.findByRole('button', { name: '+ New character' })
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(await screen.findByRole('button', { name: /log in.*sign up/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Username:')).not.toBeInTheDocument()
  })
})
