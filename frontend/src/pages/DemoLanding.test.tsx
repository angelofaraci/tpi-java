import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DemoLanding } from './DemoLanding'

vi.mock('../services/api', () => ({
  api: {
    demo: {
      campaigns: vi.fn(),
      characters: vi.fn(),
    },
  },
}))

import { api } from '../services/api'

describe('DemoLanding', () => {
  const onLoginRequest = vi.fn()
  const onSelectCharacter = vi.fn()
  const onSelectCampaign = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the demo campaign and character cards with a login/signup CTA', async () => {
    vi.mocked(api.demo.campaigns).mockResolvedValue([
      { id: 1, name: 'Demo Campaign', description: 'A sample adventure', creationDate: '2025-01-01T00:00:00.000+00:00', characterCount: 2 },
    ])
    vi.mocked(api.demo.characters).mockResolvedValue([
      { id: 100, name: 'Aldric', raceName: 'Human', level: 3, alignment: 'Lawful Good' },
      { id: 101, name: 'Seraphine', raceName: 'Elf', level: 2, alignment: 'Chaotic Good' },
    ])

    render(
      <DemoLanding
        onLoginRequest={onLoginRequest}
        onSelectCharacter={onSelectCharacter}
        onSelectCampaign={onSelectCampaign}
      />,
    )

    expect(await screen.findByText('Demo Campaign')).toBeInTheDocument()
    expect(screen.getByText('Aldric')).toBeInTheDocument()
    expect(screen.getByText('Seraphine')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in.*sign up/i })).toBeInTheDocument()
  })

  it('calls onLoginRequest when the CTA button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(api.demo.campaigns).mockResolvedValue([])
    vi.mocked(api.demo.characters).mockResolvedValue([])

    render(
      <DemoLanding
        onLoginRequest={onLoginRequest}
        onSelectCharacter={onSelectCharacter}
        onSelectCampaign={onSelectCampaign}
      />,
    )

    await user.click(await screen.findByRole('button', { name: /log in.*sign up/i }))
    expect(onLoginRequest).toHaveBeenCalled()
  })

  it('calls onSelectCampaign with the campaign id when the campaign card is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(api.demo.campaigns).mockResolvedValue([
      { id: 1, name: 'Demo Campaign', description: 'A sample adventure', creationDate: '2025-01-01T00:00:00.000+00:00', characterCount: 2 },
    ])
    vi.mocked(api.demo.characters).mockResolvedValue([])

    render(
      <DemoLanding
        onLoginRequest={onLoginRequest}
        onSelectCharacter={onSelectCharacter}
        onSelectCampaign={onSelectCampaign}
      />,
    )

    await user.click(await screen.findByRole('button', { name: /Demo Campaign/ }))
    expect(onSelectCampaign).toHaveBeenCalledWith(1)
  })

  it('calls onSelectCharacter with the character id when a character card is opened', async () => {
    const user = userEvent.setup()
    vi.mocked(api.demo.campaigns).mockResolvedValue([])
    vi.mocked(api.demo.characters).mockResolvedValue([
      { id: 100, name: 'Aldric', raceName: 'Human', level: 3, alignment: 'Lawful Good' },
    ])

    render(<DemoLanding onLoginRequest={onLoginRequest} onSelectCharacter={onSelectCharacter} onSelectCampaign={onSelectCampaign} />)

    await user.click(await screen.findByRole('button', { name: /Aldric/ }))
    expect(onSelectCharacter).toHaveBeenCalledWith(100)
  })

  it('shows an empty state when there are no demo characters yet, without crashing', async () => {
    vi.mocked(api.demo.campaigns).mockResolvedValue([])
    vi.mocked(api.demo.characters).mockResolvedValue([])

    render(<DemoLanding onLoginRequest={onLoginRequest} onSelectCharacter={onSelectCharacter} onSelectCampaign={onSelectCampaign} />)

    expect(await screen.findByText(/no demo characters/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in.*sign up/i })).toBeInTheDocument()
  })

  it('shows a graceful error state when the demo endpoints fail, keeping the CTA usable', async () => {
    vi.mocked(api.demo.campaigns).mockRejectedValue(new Error('Error 500: boom'))
    vi.mocked(api.demo.characters).mockRejectedValue(new Error('Error 500: boom'))

    render(<DemoLanding onLoginRequest={onLoginRequest} onSelectCharacter={onSelectCharacter} onSelectCampaign={onSelectCampaign} />)

    expect(await screen.findByText(/demo.*unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in.*sign up/i })).toBeInTheDocument()
  })
})
