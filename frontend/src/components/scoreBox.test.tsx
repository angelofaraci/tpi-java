import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AbilityScoreStrip } from './scoreBox'
import type { AbilityScores } from '../interfaces/character'

const baseScores: AbilityScores = {
  Strength: 10,
  Dexterity: 12,
  Constitution: 13,
  Intelligence: 14,
  Wisdom: 8,
  Charisma: 9,
}

describe('AbilityScoreStrip', () => {
  it('renders the six ability labels in fixed STR-CHA order', () => {
    render(<AbilityScoreStrip abilityScores={baseScores} />)

    const labels = screen.getAllByText(/^(STR|DEX|CON|INT|WIS|CHA)$/)
    expect(labels.map((el) => el.textContent)).toEqual(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'])
  })

  it('renders each ability score value', () => {
    render(<AbilityScoreStrip abilityScores={baseScores} />)

    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('marks a score of 16 or higher as highlighted', () => {
    render(<AbilityScoreStrip abilityScores={{ ...baseScores, Strength: 16 }} />)

    expect(screen.getByText('16')).toHaveAttribute('data-highlighted', 'true')
  })

  it('does not highlight a score of 15', () => {
    render(<AbilityScoreStrip abilityScores={{ ...baseScores, Strength: 15 }} />)

    expect(screen.getByText('15')).toHaveAttribute('data-highlighted', 'false')
  })
})
