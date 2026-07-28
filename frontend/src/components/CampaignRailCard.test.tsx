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

})

describe('CampaignRailCard — interactive mode', () => {
  it('interactive={false}, featured DM: hides Open table/Open → and has no buttons at all', () => {
    render(<CampaignRailCard campaign={buildCampaign()} featured interactive={false} />)

    expect(screen.queryByRole('button', { name: 'Open table' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open →' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('interactive={false}: campaign name renders as text, not a button', () => {
    render(<CampaignRailCard campaign={buildCampaign()} interactive={false} />)

    expect(screen.getByText('Stormwreck Isle')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stormwreck Isle' })).not.toBeInTheDocument()
  })

  it('interactive={false}, featured DM: the join code well still renders without the copy button', () => {
    render(<CampaignRailCard campaign={buildCampaign()} featured interactive={false} />)

    expect(screen.getByText('A3F9-B72C')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('interactive={false}, non-featured PLAYER variant: hero name renders, Open → does not', () => {
    render(
      <CampaignRailCard
        campaign={buildCampaign({ role: 'PLAYER', joinCode: undefined, heroName: 'Iria' })}
        interactive={false}
      />,
    )

    expect(screen.getByText('Your hero: Iria')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open →' })).not.toBeInTheDocument()
  })

  it('interactive={false}: role chip and meta line remain unchanged', () => {
    render(<CampaignRailCard campaign={buildCampaign()} interactive={false} />)

    expect(screen.getByText('DM')).toBeInTheDocument()
    expect(screen.getByText('5 players · 2 of your heroes')).toBeInTheDocument()
  })

  it('default (interactive omitted): Open → is present and onOpen fires', () => {
    const onOpen = vi.fn()
    render(<CampaignRailCard campaign={buildCampaign()} onOpen={onOpen} />)

    screen.getByRole('button', { name: 'Open →' }).click()

    expect(onOpen).toHaveBeenCalledWith(42)
  })
})
