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
      findByUserId: vi.fn(),
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
    vi.clearAllMocks()
    localStorage.setItem('token', 'test-token')

    vi.mocked(api.auth.me).mockResolvedValue({ id: 7 })
    vi.mocked(api.characters.findByUserId).mockResolvedValue([])
    vi.mocked(api.characters.findAll).mockResolvedValue([])
    vi.mocked(api.characters.create).mockResolvedValue({ id: 31, name: 'Iria' } as never)
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
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '2' } })
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
})
