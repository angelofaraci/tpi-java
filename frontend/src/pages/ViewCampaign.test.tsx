import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../services/api'
import { ViewCampaign } from './ViewCampaign'
import type { Campaign } from '../interfaces/campaign'

vi.mock('../services/api', () => ({
  api: {
    campaigns: {
      findById: vi.fn(),
    },
  },
}))

const mockCampaignWithCharacters: Campaign = {
  id: 11,
  name: 'Intro to Stormwreck Isle',
  description: 'Starter set adventure',
  privacy: false,
  creationDate: '2025-11-29T00:00:00.000+00:00',
  players: [{ id: 3, username: 'alice', email: 'alice@example.com' }],
  characters: [
    {
      id: 31,
      name: 'Iria',
      alignment: 'Neutral Good',
      user: { id: 3, username: 'alice' },
      race: { id: 7, name: 'Elf' },
    },
    {
      id: 44,
      name: 'Borin',
      alignment: 'Lawful Good',
      user: { id: 4, username: 'bob' },
      race: { id: 8, name: 'Dwarf' },
    },
  ],
}

const defaultProps = {
  campaignId: 11,
  isDungeonMaster: false,
  onBack: vi.fn(),
  onLogout: vi.fn(),
  onDeleteCampaign: vi.fn(),
  deletingCampaignId: null,
  deleteError: null,
}

describe('ViewCampaign — DM Edit button visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.campaigns.findById).mockResolvedValue(mockCampaignWithCharacters as never)
  })

  it('renders an Edit button for each character when isDungeonMaster is true and onEditCharacter is provided', async () => {
    const onEditCharacter = vi.fn()

    render(
      <ViewCampaign
        {...defaultProps}
        isDungeonMaster={true}
        onEditCharacter={onEditCharacter}
      />,
    )

    // Wait for campaign to load
    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()

    const editButtons = screen.getAllByRole('button', { name: /Edit/ })
    expect(editButtons).toHaveLength(2)
  })

  it('calls onEditCharacter with the character id when the DM clicks Edit', async () => {
    const user = userEvent.setup()
    const onEditCharacter = vi.fn()

    render(
      <ViewCampaign
        {...defaultProps}
        isDungeonMaster={true}
        onEditCharacter={onEditCharacter}
      />,
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()

    const editButtons = screen.getAllByRole('button', { name: /Edit/ })
    await user.click(editButtons[0])

    expect(onEditCharacter).toHaveBeenCalledTimes(1)
    expect(onEditCharacter).toHaveBeenCalledWith(31)
  })

  it('does NOT render Edit buttons when isDungeonMaster is false', async () => {
    const onEditCharacter = vi.fn()

    render(
      <ViewCampaign
        {...defaultProps}
        isDungeonMaster={false}
        onEditCharacter={onEditCharacter}
      />,
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()

    const editButtons = screen.queryAllByRole('button', { name: /Edit/ })
    expect(editButtons).toHaveLength(0)
  })

  it('does NOT render Edit buttons when onEditCharacter is not provided (even if isDungeonMaster is true)', async () => {
    render(
      <ViewCampaign
        {...defaultProps}
        isDungeonMaster={true}
        // onEditCharacter intentionally omitted
      />,
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()

    const editButtons = screen.queryAllByRole('button', { name: /Edit/ })
    expect(editButtons).toHaveLength(0)
  })
})

describe('ViewCampaign — own-character Edit button visibility (non-DM players)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.campaigns.findById).mockResolvedValue(mockCampaignWithCharacters as never)
  })

  it('renders an Edit button only for the character owned by currentUserId when not the DM', async () => {
    render(
      <ViewCampaign
        {...defaultProps}
        isDungeonMaster={false}
        currentUserId={3}
        onEditCharacter={vi.fn()}
      />,
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()

    const editButtons = screen.getAllByRole('button', { name: /Edit/ })
    expect(editButtons).toHaveLength(1)
  })

  it('calls onEditCharacter with the owned character id when a player clicks Edit on their own character', async () => {
    const user = userEvent.setup()
    const onEditCharacter = vi.fn()

    render(
      <ViewCampaign
        {...defaultProps}
        isDungeonMaster={false}
        currentUserId={3}
        onEditCharacter={onEditCharacter}
      />,
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Edit/ }))

    expect(onEditCharacter).toHaveBeenCalledWith(31)
  })

  it('does NOT render an Edit button for another player\'s character when not the DM', async () => {
    render(
      <ViewCampaign
        {...defaultProps}
        isDungeonMaster={false}
        currentUserId={999}
        onEditCharacter={vi.fn()}
      />,
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Intro to Stormwreck Isle' })).toBeInTheDocument()

    expect(screen.queryAllByRole('button', { name: /Edit/ })).toHaveLength(0)
  })
})
