import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('renders with default (non-invalid, display font) styling', () => {
    render(<Input aria-label="Username" />)
    const input = screen.getByLabelText('Username')
    expect(input.className).toContain('border-home-border-mid')
    expect(input.className).not.toContain('border-home-danger')
    expect(input.className).not.toContain('font-home-mono')
  })

  it('applies invalid border styling when invalid is true', () => {
    render(<Input aria-label="Code" invalid />)
    const input = screen.getByLabelText('Code')
    expect(input.className).toContain('border-home-danger')
    expect(input.className).not.toContain('border-home-border-mid')
  })

  it('applies mono font classes when font="mono"', () => {
    render(<Input aria-label="Join code" font="mono" />)
    const input = screen.getByLabelText('Join code')
    expect(input.className).toContain('font-home-mono')
    expect(input.className).toContain('tracking-[.08em]')
  })

  it('forwards standard input props (value, onChange, type, disabled)', () => {
    render(<Input aria-label="Password" type="password" disabled value="secret" onChange={() => {}} />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toBeDisabled()
    expect(input).toHaveValue('secret')
  })
})
