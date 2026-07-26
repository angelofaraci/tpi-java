import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricTile } from './MetricTile'

describe('MetricTile', () => {
  it('renders the value and the uppercase label', () => {
    render(<MetricTile value={8} label="PLAYERS AT YOUR TABLES" />)

    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('PLAYERS AT YOUR TABLES')).toBeInTheDocument()
  })

  it('renders a string value as-is', () => {
    render(<MetricTile value="—" label="CAMPAIGNS" />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('applies the optional valueClassName to the value element', () => {
    render(<MetricTile value={2} label="AS DUNGEON MASTER" valueClassName="text-home-blue-400" />)

    expect(screen.getByText('2')).toHaveClass('text-home-blue-400')
  })

  it('does not apply any special class to the value when valueClassName is omitted', () => {
    render(<MetricTile value={2} label="CHARACTERS" />)

    expect(screen.getByText('2')).not.toHaveClass('text-home-blue-400')
  })
})
