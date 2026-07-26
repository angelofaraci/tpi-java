import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CharacterCard } from './CharacterCard'
import type { Character, LevelRecord } from '../interfaces/character'

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 7,
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

const emptyLevels = new Map<number, LevelRecord[]>()

describe('CharacterCard — derivation rules', () => {
  it('highlights an ability score of 16 or higher in the strip', () => {
    render(
      <CharacterCard
        character={buildCharacter()}
        campaignName="Stormwreck"
        isDungeonMaster={false}
        onOpenSheet={vi.fn()}
        levelsByCharacterId={emptyLevels}
      />,
    )

    expect(screen.getByText('16')).toHaveAttribute('data-highlighted', 'true')
  })

  it('derives AC from Dexterity using 10 + floor((DEX-10)/2)', () => {
    render(
      <CharacterCard
        character={buildCharacter()}
        campaignName="Stormwreck"
        isDungeonMaster={false}
        onOpenSheet={vi.fn()}
        levelsByCharacterId={emptyLevels}
      />,
    )

    // DEX 14 -> 10 + floor(4/2) = 12
    expect(screen.getByTestId('character-card-ac')).toHaveTextContent('12')
    expect(screen.getByText('AC')).toBeInTheDocument()
  })

  it('renders the subtitle as {race} · {class} with no subclass parenthetical', () => {
    render(
      <CharacterCard
        character={buildCharacter()}
        campaignName="Stormwreck"
        isDungeonMaster={false}
        onOpenSheet={vi.fn()}
        levelsByCharacterId={emptyLevels}
      />,
    )

    expect(screen.getByText('Elf · Wizard')).toBeInTheDocument()
  })

  it('shows Unassigned when the campaign name is unresolved', () => {
    render(
      <CharacterCard
        character={buildCharacter()}
        campaignName={null}
        isDungeonMaster={false}
        onOpenSheet={vi.fn()}
        levelsByCharacterId={emptyLevels}
      />,
    )

    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('renders the resolved campaign name when provided', () => {
    render(
      <CharacterCard
        character={buildCharacter()}
        campaignName="Stormwreck"
        isDungeonMaster={false}
        onOpenSheet={vi.fn()}
        levelsByCharacterId={emptyLevels}
      />,
    )

    expect(screen.getByText('Stormwreck')).toBeInTheDocument()
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
  })

  it('calls onOpenSheet with the character id when the card is clicked', () => {
    const onOpenSheet = vi.fn()
    render(
      <CharacterCard
        character={buildCharacter()}
        campaignName="Stormwreck"
        isDungeonMaster={false}
        onOpenSheet={onOpenSheet}
        levelsByCharacterId={emptyLevels}
      />,
    )

    screen.getByText('Iria').click()

    expect(onOpenSheet).toHaveBeenCalledWith(7)
  })

  it('does not call onOpenSheet when the ··· menu is clicked, and calls onRequestDelete instead', () => {
    const onOpenSheet = vi.fn()
    const onRequestDelete = vi.fn()
    render(
      <CharacterCard
        character={buildCharacter()}
        campaignName="Stormwreck"
        isDungeonMaster={false}
        onOpenSheet={onOpenSheet}
        onRequestDelete={onRequestDelete}
        levelsByCharacterId={emptyLevels}
      />,
    )

    screen.getByRole('button', { name: '···' }).click()

    expect(onOpenSheet).not.toHaveBeenCalled()
    expect(onRequestDelete).toHaveBeenCalledWith(7, 'Iria')
  })
})

describe('CharacterCard — level badge derivation', () => {
  it('shows LV {level1}/{level2} for a multiclass character, ordered by characterClasses', () => {
    const character = buildCharacter({
      characterClasses: [
        { id: 8, name: 'Wizard', description: '' },
        { id: 9, name: 'Fighter', description: '' },
      ],
    })
    const levels = new Map<number, LevelRecord[]>([
      [
        7,
        [
          { dndClass: { id: 8 }, level: 3 },
          { dndClass: { id: 9 }, level: 2 },
        ],
      ],
    ])

    render(
      <CharacterCard
        character={character}
        campaignName="Stormwreck"
        isDungeonMaster={false}
        onOpenSheet={vi.fn()}
        levelsByCharacterId={levels}
      />,
    )

    expect(screen.getByText('LV 3/2')).toBeInTheDocument()
  })

  it('omits the level badge when no matching level records exist', () => {
    render(
      <CharacterCard
        character={buildCharacter()}
        campaignName="Stormwreck"
        isDungeonMaster={false}
        onOpenSheet={vi.fn()}
        levelsByCharacterId={emptyLevels}
      />,
    )

    expect(screen.queryByText(/^LV /)).not.toBeInTheDocument()
  })

  it('shows a single LV {level} badge for a single-class character', () => {
    const levels = new Map<number, LevelRecord[]>([[7, [{ dndClass: { id: 8 }, level: 5 }]]])

    render(
      <CharacterCard
        character={buildCharacter()}
        campaignName="Stormwreck"
        isDungeonMaster={false}
        onOpenSheet={vi.fn()}
        levelsByCharacterId={levels}
      />,
    )

    expect(screen.getByText('LV 5')).toBeInTheDocument()
  })
})
