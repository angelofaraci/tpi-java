import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DemoCampaignDetail } from './DemoCampaignDetail'

vi.mock('../services/api', () => ({
  api: {
    demo: {
      campaignById: vi.fn(),
    },
  },
}))

import { api } from '../services/api'

describe('DemoCampaignDetail', () => {
  const onBack = vi.fn()
  const onSelectCharacter = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the campaign name, description, creation date, and its characters', async () => {
    vi.mocked(api.demo.campaignById).mockResolvedValue({
      id: 1,
      name: 'Demo Campaign',
      description: 'A sample adventure',
      creationDate: '2025-01-01T00:00:00.000+00:00',
      characters: [
        { id: 100, name: 'Aldric', raceName: 'Human', level: 3, alignment: 'Lawful Good' },
        { id: 101, name: 'Seraphine', raceName: 'Elf', level: 2, alignment: 'Chaotic Good' },
      ],
    })

    render(<DemoCampaignDetail campaignId={1} onBack={onBack} onSelectCharacter={onSelectCharacter} />)

    expect(await screen.findByText('Demo Campaign')).toBeInTheDocument()
    expect(screen.getByText('A sample adventure')).toBeInTheDocument()
    expect(screen.getByText('Aldric')).toBeInTheDocument()
    expect(screen.getByText('Seraphine')).toBeInTheDocument()
  })

  it('calls onSelectCharacter with the character id when a character is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(api.demo.campaignById).mockResolvedValue({
      id: 1,
      name: 'Demo Campaign',
      characters: [{ id: 100, name: 'Aldric', raceName: 'Human', level: 3, alignment: 'Lawful Good' }],
    })

    render(<DemoCampaignDetail campaignId={1} onBack={onBack} onSelectCharacter={onSelectCharacter} />)

    await user.click(await screen.findByRole('button', { name: /Aldric/ }))
    expect(onSelectCharacter).toHaveBeenCalledWith(100)
  })

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(api.demo.campaignById).mockResolvedValue({
      id: 1,
      name: 'Demo Campaign',
      characters: [],
    })

    render(<DemoCampaignDetail campaignId={1} onBack={onBack} onSelectCharacter={onSelectCharacter} />)

    await user.click(await screen.findByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('shows a graceful message when the campaign is unavailable (404), without crashing', async () => {
    vi.mocked(api.demo.campaignById).mockRejectedValue(new Error('Error 404: Not Found'))

    render(<DemoCampaignDetail campaignId={999} onBack={onBack} onSelectCharacter={onSelectCharacter} />)

    expect(await screen.findByText(/unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('shows an empty state when the campaign has no characters yet, without crashing', async () => {
    vi.mocked(api.demo.campaignById).mockResolvedValue({
      id: 1,
      name: 'Demo Campaign',
      characters: [],
    })

    render(<DemoCampaignDetail campaignId={1} onBack={onBack} onSelectCharacter={onSelectCharacter} />)

    expect(await screen.findByText(/no (demo )?characters/i)).toBeInTheDocument()
  })
})
