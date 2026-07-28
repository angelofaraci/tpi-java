import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Home } from './Home'
import type { Character, LevelRecord } from '../interfaces/character'
import type { RailCampaign } from '../components/CampaignRailCard'

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 1,
    user: { id: 1 },
    campaign: { id: 3 },
    name: 'Iria',
    characterClasses: [{ id: 8, name: 'Wizard', description: '' }],
    characteristics: [],
    alignment: 'Neutral Good',
    background: 'Sage',
    characterStats: {
      xp: 0,
      proficiency: 2,
      abilityScores: {
        Strength: 10,
        Dexterity: 14,
        Constitution: 12,
        Intelligence: 16,
        Wisdom: 13,
        Charisma: 8,
      },
      velocities: [30],
      proficiencies: {},
      hp: 8,
    },
    race: { id: 2, name: 'Elf', description: '' },
    ...overrides,
  }
}

const defaultProps = {
  username: 'pancho',
  userRole: 'ROLE_USER' as const,
  onLogout: vi.fn(),
  status: 'ready' as const,
  characters: [] as Character[],
  campaignNameById: new Map<number, string>(),
  levelsByCharacterId: new Map<number, LevelRecord[]>(),
  railCampaigns: [] as RailCampaign[],
  metrics: { campaignsCount: 0, charactersCount: 0, asDmCount: 0, playersAtTables: 0 },
  filter: 'all' as const,
  sort: 'recent' as const,
  joinCode: '',
  onOpenCreateCharacter: vi.fn(),
  onOpenCreateCampaign: vi.fn(),
  onOpenSheet: vi.fn(),
  onOpenCampaign: vi.fn(),
  onRequestDeleteCharacter: vi.fn(),
  onFilterChange: vi.fn(),
  onSortChange: vi.fn(),
  onJoinCodeChange: vi.fn(),
  onJoinSubmit: vi.fn(),
  onRetry: vi.fn(),
}

describe('Home — top bar', () => {
  it('renders the brand wordmark and nav items', () => {
    render(<Home {...defaultProps} />)

    expect(screen.getByText('D&D MANAGER')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Characters' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Campaigns' })).not.toBeInTheDocument()
  })

  it('marks Home as the active nav item by default', () => {
    render(<Home {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  it('marks Admin as the active nav item when activeNav is admin', () => {
    render(<Home {...defaultProps} userRole="ROLE_ADMIN" activeNav="admin" />)

    expect(screen.getByRole('button', { name: 'Admin' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('hides the Admin nav item for a non-admin user', () => {
    render(<Home {...defaultProps} userRole="ROLE_USER" />)

    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('shows the Admin nav item for an admin user', () => {
    render(<Home {...defaultProps} userRole="ROLE_ADMIN" />)

    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument()
  })

  it('calls onOpenAdmin when the Admin nav item is clicked', async () => {
    const onOpenAdmin = vi.fn()
    render(<Home {...defaultProps} userRole="ROLE_ADMIN" onOpenAdmin={onOpenAdmin} />)

    screen.getByRole('button', { name: 'Admin' }).click()

    expect(onOpenAdmin).toHaveBeenCalledTimes(1)
  })

  it('does not render the unimplemented search field', () => {
    render(<Home {...defaultProps} />)

    expect(screen.queryByPlaceholderText('Search or paste join code')).not.toBeInTheDocument()
  })

  it('derives avatar initials from the uppercased first two characters of the username', () => {
    render(<Home {...defaultProps} username="pancho" />)

    expect(screen.getByText('PA')).toBeInTheDocument()
  })

  it('derives avatar initials for a short single-character username without crashing', () => {
    render(<Home {...defaultProps} username="a" />)

    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('calls onLogout when the logout button is clicked', () => {
    const onLogout = vi.fn()
    render(<Home {...defaultProps} onLogout={onLogout} />)

    screen.getByRole('button', { name: 'Logout' }).click()

    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})

describe('Home — hero', () => {
  it('greets the user with Welcome back, {firstName}', () => {
    render(<Home {...defaultProps} username="pancho" />)

    expect(screen.getByText(/Welcome back,/)).toBeInTheDocument()
  })

  it('shows the DM subtitle when the user is DM of at least one campaign, even if also a player elsewhere', () => {
    render(
      <Home
        {...defaultProps}
        metrics={{ campaignsCount: 3, charactersCount: 0, asDmCount: 1, playersAtTables: 2 }}
        railCampaigns={[
          { id: 1, name: 'A', role: 'DM' },
          { id: 2, name: 'B', role: 'PLAYER' },
          { id: 3, name: 'C', role: 'PLAYER' },
        ]}
      />,
    )

    expect(screen.getByText(/Dungeon Master/)).toBeInTheDocument()
  })

  it('shows the onboarding subtitle when both DM and player campaign counts are zero', () => {
    render(<Home {...defaultProps} metrics={{ campaignsCount: 0, charactersCount: 0, asDmCount: 0, playersAtTables: 0 }} railCampaigns={[]} />)

    expect(screen.getByText('Start by creating a campaign, or join one with a code.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New character' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New campaign' })).toBeInTheDocument()
  })

  it('calls onOpenCreateCharacter / onOpenCreateCampaign from the primary actions', () => {
    const onOpenCreateCharacter = vi.fn()
    const onOpenCreateCampaign = vi.fn()
    render(<Home {...defaultProps} onOpenCreateCharacter={onOpenCreateCharacter} onOpenCreateCampaign={onOpenCreateCampaign} />)

    screen.getByRole('button', { name: '+ New character' }).click()
    screen.getByRole('button', { name: '+ New campaign' }).click()

    expect(onOpenCreateCharacter).toHaveBeenCalledTimes(1)
    expect(onOpenCreateCampaign).toHaveBeenCalledTimes(1)
  })
})

describe('Home — metrics bar', () => {
  it('always renders exactly 4 tiles, even when every count is zero', () => {
    render(<Home {...defaultProps} metrics={{ campaignsCount: 0, charactersCount: 0, asDmCount: 0, playersAtTables: 0 }} />)

    expect(screen.getByText('CAMPAIGNS')).toBeInTheDocument()
    expect(screen.getByText('CHARACTERS')).toBeInTheDocument()
    expect(screen.getByText('AS DUNGEON MASTER')).toBeInTheDocument()
    expect(screen.getByText('PLAYERS AT YOUR TABLES')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('renders the sum of playerCount across DM campaigns for tile 4', () => {
    render(<Home {...defaultProps} metrics={{ campaignsCount: 2, charactersCount: 0, asDmCount: 2, playersAtTables: 8 }} />)

    expect(screen.getByText('8')).toBeInTheDocument()
  })
})

describe('Home — character grid', () => {
  it('shows CreateCharacterCTA as the only grid content when there are zero characters', () => {
    render(<Home {...defaultProps} characters={[]} />)

    expect(screen.getByText('Forge your first adventurer')).toBeInTheDocument()
  })

  it('renders a CharacterCard per character and calls onOpenSheet when clicked', () => {
    const onOpenSheet = vi.fn()
    render(<Home {...defaultProps} characters={[buildCharacter()]} onOpenSheet={onOpenSheet} />)

    screen.getByText('Iria').click()

    expect(onOpenSheet).toHaveBeenCalledWith(1)
  })

  it('the retired filter yields an empty grid (no active/retired field exists)', () => {
    render(<Home {...defaultProps} characters={[buildCharacter()]} filter="retired" />)

    expect(screen.queryByText('Iria')).not.toBeInTheDocument()
    expect(screen.getByText('Forge another adventurer')).toBeInTheDocument()
  })

  it('all and active filters render identical results', () => {
    const { unmount } = render(<Home {...defaultProps} characters={[buildCharacter()]} filter="all" />)
    expect(screen.getByText('Iria')).toBeInTheDocument()
    unmount()

    render(<Home {...defaultProps} characters={[buildCharacter()]} filter="active" />)
    expect(screen.getByText('Iria')).toBeInTheDocument()
  })

  it('sorts by name ascending, case-insensitively', () => {
    render(
      <Home
        {...defaultProps}
        characters={[buildCharacter({ id: 1, name: 'zara' }), buildCharacter({ id: 2, name: 'Aldric' })]}
        sort="name"
      />,
    )

    const names = screen.getAllByText(/^(zara|Aldric)$/).map((el) => el.textContent)
    expect(names).toEqual(['Aldric', 'zara'])
  })

  it('calls onFilterChange and onSortChange from the grid controls', () => {
    const onFilterChange = vi.fn()
    const onSortChange = vi.fn()
    render(<Home {...defaultProps} onFilterChange={onFilterChange} onSortChange={onSortChange} />)

    screen.getByRole('button', { name: 'Retired' }).click()
    expect(onFilterChange).toHaveBeenCalledWith('retired')

    screen.getByLabelText('Sort characters').focus()
  })
})

describe('Home — campaign rail', () => {
  it('picks the featured variant from the first GET /campaigns/mine (DM) entry', () => {
    render(
      <Home
        {...defaultProps}
        railCampaigns={[
          { id: 1, name: 'Player Table', role: 'PLAYER' },
          { id: 2, name: 'DM Table', role: 'DM', joinCode: 'A3F9-B72C' },
        ]}
      />,
    )

    // Featured card shows the "Open table" action; normal cards show "Open →".
    expect(screen.getByRole('button', { name: 'Open table' })).toBeInTheDocument()
  })

  it('shows a single dashed "No tables yet" card when there are zero campaigns, with Join a table still visible', () => {
    render(<Home {...defaultProps} railCampaigns={[]} />)

    expect(screen.getByText('No tables yet')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('A3F9-B72C')).toBeInTheDocument()
  })

  it('calls onOpenCampaign when a campaign name in the rail is clicked', () => {
    const onOpenCampaign = vi.fn()
    render(
      <Home
        {...defaultProps}
        railCampaigns={[{ id: 9, name: 'Stormwreck', role: 'DM', joinCode: 'X' }]}
        onOpenCampaign={onOpenCampaign}
      />,
    )

    screen.getByText('Stormwreck').click()

    expect(onOpenCampaign).toHaveBeenCalledWith(9)
  })
})

describe('Home — join by code', () => {
  it('uppercases and auto-hyphenates while typing into the Join a table input', () => {
    const onJoinCodeChange = vi.fn()
    render(<Home {...defaultProps} joinCode="" onJoinCodeChange={onJoinCodeChange} />)

    const input = screen.getByPlaceholderText('A3F9-B72C')
    fireEvent.change(input, { target: { value: 'a3f9b72c' } })

    expect(onJoinCodeChange).toHaveBeenCalledWith('A3F9-B72C')
  })

  it('calls onJoinSubmit when the Join button is clicked', () => {
    const onJoinSubmit = vi.fn()
    render(<Home {...defaultProps} joinCode="A3F9-B72C" onJoinSubmit={onJoinSubmit} />)

    screen.getByRole('button', { name: 'Join' }).click()

    expect(onJoinSubmit).toHaveBeenCalledTimes(1)
  })
})

// Spec: "Responsive Contract" (768-1023, 1024-1279, <768 breakpoints). jsdom does not
// execute real CSS media queries (no `css: true`/browser mode — same constraint
// documented in `index.css.test.ts`), so these assert the exact Tailwind utility
// classes design.md's "Responsive Strategy" table prescribes, at the source level,
// rather than actual rendered layout at a given viewport width.
describe('Home — responsive utility classes', () => {
  it('sets the body grid to 320px rail at lg and 368px rail at xl', () => {
    render(<Home {...defaultProps} />)

    const bodyGrid = screen.getByTestId('home-body-grid')
    expect(bodyGrid).toHaveClass('grid-cols-1')
    expect(bodyGrid).toHaveClass('lg:grid-cols-[1fr_320px]')
    expect(bodyGrid).toHaveClass('xl:grid-cols-[1fr_368px]')
  })

  it('keeps the metrics bar at 2 columns below md and 4 columns at md and above', () => {
    render(<Home {...defaultProps} />)

    const metricsGrid = screen.getByTestId('home-metrics-grid')
    expect(metricsGrid).toHaveClass('grid-cols-2')
    expect(metricsGrid).toHaveClass('md:grid-cols-4')
  })

  it('swaps the rail above the characters column below lg via DOM-order classes', () => {
    render(<Home {...defaultProps} />)

    expect(screen.getByTestId('home-characters-column')).toHaveClass('order-2', 'lg:order-none')
    expect(screen.getByTestId('home-campaigns-column')).toHaveClass('order-1', 'lg:order-none')
  })

  it('makes the campaign rail a horizontally scrollable row only in the md band', () => {
    render(<Home {...defaultProps} railCampaigns={[{ id: 1, name: 'A', role: 'DM' }]} />)

    const railList = screen.getByTestId('home-rail-list')
    expect(railList).toHaveClass('flex-col', 'md:flex-row', 'md:overflow-x-auto', 'lg:flex-col')
  })

  it('keeps the ability score strip at a fixed 6 columns with no responsive override', () => {
    render(<Home {...defaultProps} characters={[buildCharacter()]} />)

    expect(screen.getByRole('group', { name: 'Ability scores' })).toHaveClass('grid-cols-6')
  })
})

describe('Home — loading, error, and empty states', () => {
  it('renders exactly 4 skeleton character cards and 3 skeleton rail cards while loading', () => {
    render(<Home {...defaultProps} status="loading" />)

    expect(screen.getAllByTestId('character-card-skeleton')).toHaveLength(4)
    expect(screen.getAllByTestId('rail-card-skeleton')).toHaveLength(3)
  })

  it('renders an error band with Retry and never calls window.alert', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onRetry = vi.fn()
    render(<Home {...defaultProps} status="error" onRetry={onRetry} />)

    const retryButton = screen.getByRole('button', { name: 'Retry' })
    retryButton.click()

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(alertSpy).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('shows onboarding hero and both empty states with zero characters and zero campaigns', () => {
    render(<Home {...defaultProps} characters={[]} railCampaigns={[]} metrics={{ campaignsCount: 0, charactersCount: 0, asDmCount: 0, playersAtTables: 0 }} />)

    expect(screen.getByText('Start by creating a campaign, or join one with a code.')).toBeInTheDocument()
    expect(screen.getByText('Forge your first adventurer')).toBeInTheDocument()
    expect(screen.getByText('No tables yet')).toBeInTheDocument()
  })
})
