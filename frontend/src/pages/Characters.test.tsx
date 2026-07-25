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
    demo: {
      characterById: vi.fn(),
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

describe('Characters — demo source', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches from the demo API when source="demo" and hides edit/delete controls', async () => {
    vi.mocked(api.demo.characterById).mockResolvedValue({
      id: 100,
      name: 'Aldric',
      raceName: 'Human',
      racialFeats: [],
      background: 'Soldier',
      characteristics: [],
      alignment: 'Lawful Good',
      proficiency: 2,
      abilityScores: { Strength: 14, Dexterity: 12, Constitution: 13, Intelligence: 10, Wisdom: 11, Charisma: 8 },
      proficiencies: {},
      velocity: 30,
      hp: 12,
      classes: [],
    } as never)

    render(<Characters {...defaultProps} characterId={100} source="demo" readOnly />)

    expect(await screen.findByText('Aldric')).toBeInTheDocument()
    expect(api.demo.characterById).toHaveBeenCalledWith(100)
    expect(api.characters.findById).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Edit Character' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete Character/i })).not.toBeInTheDocument()
  })

  it('renders gracefully when a demo character has an empty classes[] array', async () => {
    vi.mocked(api.demo.characterById).mockResolvedValue({
      id: 101,
      name: 'Seraphine',
      raceName: 'Elf',
      background: 'Sage',
      alignment: 'Chaotic Good',
      proficiency: 2,
      abilityScores: { Strength: 8, Dexterity: 16, Constitution: 12, Intelligence: 14, Wisdom: 12, Charisma: 10 },
      proficiencies: {},
      velocity: 30,
      hp: 9,
      classes: [],
    } as never)

    render(<Characters {...defaultProps} characterId={101} source="demo" readOnly />)

    expect(await screen.findByText('Seraphine')).toBeInTheDocument()
    expect(screen.getByText('Not Specified')).toBeInTheDocument()
    expect(screen.getByText('No class features')).toBeInTheDocument()
  })

  it('forces read-only behavior for source="demo" even if readOnly is not explicitly passed', async () => {
    vi.mocked(api.demo.characterById).mockResolvedValue({
      id: 100,
      name: 'Aldric',
      raceName: 'Human',
      classes: [],
    } as never)

    render(<Characters {...defaultProps} characterId={100} source="demo" />)

    expect(await screen.findByText('Aldric')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Character' })).not.toBeInTheDocument()
  })

  it('shows a graceful unavailable message when the demo character id is not found (404)', async () => {
    vi.mocked(api.demo.characterById).mockRejectedValue(new Error('Error 404: Not Found'))

    render(<Characters {...defaultProps} characterId={999} source="demo" readOnly />)

    expect(await screen.findByText(/demo sheet is unavailable/i)).toBeInTheDocument()
  })
})
