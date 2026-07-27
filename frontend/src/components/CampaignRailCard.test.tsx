import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CampaignRailCard, type RailCampaign } from './CampaignRailCard'

function buildCampaign(overrides: Partial<RailCampaign> = {}): RailCampaign {
  return {
    id: 42,
    name: 'Stormwreck Isle',
    role: 'DM',
    joinCode: 'A3F9-B72C',
    playerCount: 5,
    characterCount: 2,
    ...overrides,
  }
}

describe('CampaignRailCard — role logic and variants', () => {
  it('shows the DM role chip and the join code for a DM campaign', () => {
    render(<CampaignRailCard campaign={buildCampaign()} onOpen={vi.fn()} />)

    expect(screen.getByText('DM')).toBeInTheDocument()
    expect(screen.getByText('A3F9-B72C')).toBeInTheDocument()
  })

  it('shows the PLAYER role chip and hides the join code for a player campaign', () => {
    render(
      <CampaignRailCard
        campaign={buildCampaign({ role: 'PLAYER', joinCode: undefined, heroName: 'Iria' })}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.getByText('PLAYER')).toBeInTheDocument()
    expect(screen.queryByText('A3F9-B72C')).not.toBeInTheDocument()
  })

  it('renders the meta line with only player/character counts, no Session N segment', () => {
    render(<CampaignRailCard campaign={buildCampaign({ playerCount: 5, characterCount: 2 })} onOpen={vi.fn()} />)

    expect(screen.getByText('5 players · 2 of your heroes')).toBeInTheDocument()
    expect(screen.queryByText(/Session/)).not.toBeInTheDocument()
  })

  it('shows Manage only for the featured DM variant', () => {
    render(<CampaignRailCard campaign={buildCampaign()} featured onOpen={vi.fn()} onManage={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Manage' })).toBeInTheDocument()
  })

  it('hides Manage for a featured player campaign', () => {
    render(
      <CampaignRailCard
        campaign={buildCampaign({ role: 'PLAYER', joinCode: undefined })}
        featured
        onOpen={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Manage' })).not.toBeInTheDocument()
  })

  it('shows "Your hero: {name}" in the normal player variant', () => {
    render(
      <CampaignRailCard
        campaign={buildCampaign({ role: 'PLAYER', joinCode: undefined, heroName: 'Iria' })}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.getByText('Your hero: Iria')).toBeInTheDocument()
  })

  it('calls onOpen with the campaign id when the campaign name is clicked', () => {
    const onOpen = vi.fn()
    render(<CampaignRailCard campaign={buildCampaign()} onOpen={onOpen} />)

    screen.getByText('Stormwreck Isle').click()

    expect(onOpen).toHaveBeenCalledWith(42)
  })

  it('calls onManage with the campaign id when Manage is clicked', () => {
    const onManage = vi.fn()
    render(<CampaignRailCard campaign={buildCampaign()} featured onOpen={vi.fn()} onManage={onManage} />)

    screen.getByRole('button', { name: 'Manage' }).click()

    expect(onManage).toHaveBeenCalledWith(42)
  })
})
