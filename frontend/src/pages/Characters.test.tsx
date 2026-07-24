import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Characters } from './Characters'

vi.mock('../services/api', () => ({
  API_BASE_URL: 'http://localhost:8080',
  api: {
    characters: {
      findById: vi.fn(),
    },
    levels: {
      findAll: vi.fn(),
    },
    classes: {
      findAll: vi.fn(),
    },
  },
}))

// Pull the mocked api AFTER the vi.mock call so the mock is applied
import { api } from '../services/api'

// ─── helpers ──────────────────────────────────────────────────────────────────

function minimalCharacterPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    user: { id: 4, username: 'testuser' },
    campaign: { id: 2, name: 'Test Campaign' },
    name: 'Aragorn',
    characterClasses: [],
    characteristics: [],
    alignment: 'Neutral Good',
    background: 'Outlander',
    characterStats: {
      id: 5,
      xp: 0,
      proficiency: 2,
      abilityScores: {
        Strength: 10,
        Dexterity: 10,
        Constitution: 10,
        Intelligence: 10,
        Wisdom: 10,
        Charisma: 10,
      },
      velocities: [30],
      proficiencies: {},
      hp: 10,
    },
    race: {
      id: 1,
      name: 'Human',
      description: 'Versatile',
      racialFeats: [],
    },
    ...overrides,
  }
}

const defaultProps = {
  characterId: 10,
  onBack: vi.fn(),
  onEditCharacter: vi.fn(),
  onLogout: vi.fn(),
  onDeleteCharacter: vi.fn(),
  deletingCharacterId: null,
  deleteError: null,
}

describe('Characters — portrait rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.levels.findAll).mockResolvedValue([])
    vi.mocked(api.classes.findAll).mockResolvedValue([])
  })

  it('renders a portrait <img> when portraitUrl is present on the character', async () => {
    vi.mocked(api.characters.findById).mockResolvedValue(
      minimalCharacterPayload({ portraitUrl: '/uploads/portraits/test.jpg' }) as never,
    )

    render(<Characters {...defaultProps} />)

    const img = await screen.findByAltText('Aragorn portrait')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'http://localhost:8080/uploads/portraits/test.jpg')
  })

  it('does not render a portrait <img> when portraitUrl is absent', async () => {
    vi.mocked(api.characters.findById).mockResolvedValue(
      minimalCharacterPayload() as never,
    )

    render(<Characters {...defaultProps} />)

    // Wait for the sheet to load
    await screen.findByText('Aragorn')
    expect(screen.queryByRole('img', { name: /portrait/i })).not.toBeInTheDocument()
  })
})
