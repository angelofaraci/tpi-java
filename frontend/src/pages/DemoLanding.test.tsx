import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DemoLanding } from './DemoLanding'
import { DEMO_CAMPAIGN, DEMO_CHARACTERS } from './demoLandingData'

describe('DemoLanding', () => {
  it('renders synchronously with no loading/error state', () => {
    render(<DemoLanding onLoginRequest={vi.fn()} />)

    expect(screen.getByText('Kaelen Vurr')).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    expect(screen.queryAllByTestId('character-card-skeleton')).toHaveLength(0)
    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('renders all three hardcoded character names', () => {
    render(<DemoLanding onLoginRequest={vi.fn()} />)

    expect(screen.getByText('Kaelen Vurr')).toBeInTheDocument()
    expect(screen.getByText('Sylra Moonhollow')).toBeInTheDocument()
    expect(screen.getByText('Bram Ironkettle')).toBeInTheDocument()
  })

  it('renders the hardcoded campaign name and join code', () => {
    render(<DemoLanding onLoginRequest={vi.fn()} />)

    expect(screen.getAllByText('The Sunken Crown').length).toBeGreaterThan(0)
    expect(screen.getByText('A3F9-B72C')).toBeInTheDocument()
  })

  it('renders the multiclass level badge for Sylra Moonhollow', () => {
    render(<DemoLanding onLoginRequest={vi.fn()} />)

    expect(screen.getByText('LV 3/2')).toBeInTheDocument()
  })

  it('renders at least one highlighted (>=16) ability score cell', () => {
    const { container } = render(<DemoLanding onLoginRequest={vi.fn()} />)

    expect(container.querySelectorAll('[data-highlighted="true"]').length).toBeGreaterThan(0)
  })

  it('renders exactly 4 metric tiles matching the hardcoded data', () => {
    render(<DemoLanding onLoginRequest={vi.fn()} />)

    expect(screen.getByText('CAMPAIGNS')).toBeInTheDocument()
    expect(screen.getByText('CHARACTERS')).toBeInTheDocument()
    expect(screen.getByText('AS DUNGEON MASTER')).toBeInTheDocument()
    expect(screen.getByText('PLAYERS AT THIS TABLE')).toBeInTheDocument()

    const grid = screen.getByTestId('demo-metrics-grid')
    expect(grid.children).toHaveLength(4)

    const charactersTile = screen.getByText('CHARACTERS').closest('div')
    expect(charactersTile?.parentElement?.textContent).toContain(String(DEMO_CHARACTERS.length))
    expect(DEMO_CHARACTERS).toHaveLength(3)

    const campaignsTile = screen.getByText('CAMPAIGNS').closest('div')
    expect(campaignsTile?.parentElement?.textContent).toContain('1')
  })

  it('renders exactly one button — the Log In / Sign Up CTA', () => {
    render(<DemoLanding onLoginRequest={vi.fn()} />)

    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveTextContent(/log in.*sign up/i)
  })

  it('renders cards with no interactive affordances (no role=button ancestor, no tabindex)', () => {
    const { container } = render(<DemoLanding onLoginRequest={vi.fn()} />)

    const characterName = screen.getByText('Kaelen Vurr')
    expect(characterName.closest('[role="button"]')).toBeNull()
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0)
  })

  it('calls onLoginRequest exactly once when the CTA is clicked', async () => {
    const user = userEvent.setup()
    const onLoginRequest = vi.fn()
    render(<DemoLanding onLoginRequest={onLoginRequest} />)

    await user.click(screen.getByRole('button', { name: /log in.*sign up/i }))
    expect(onLoginRequest).toHaveBeenCalledTimes(1)
  })

  it('does not render authenticated-only chrome', () => {
    render(<DemoLanding onLoginRequest={vi.fn()} />)

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText(/logout/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sort characters/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/join a table/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\+ new character/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\+ new campaign/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument()
  })

  it('shows the DEMO_CAMPAIGN name matches what is rendered', () => {
    render(<DemoLanding onLoginRequest={vi.fn()} />)

    expect(screen.getAllByText(DEMO_CAMPAIGN.name).length).toBeGreaterThan(0)
  })
})
