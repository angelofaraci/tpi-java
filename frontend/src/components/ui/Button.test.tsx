import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders children and defaults to primary variant, md size, type button', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toContain('bg-home-blue-600')
    expect(button.className).toContain('h-[36px]')
  })

  it('applies the secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button', { name: 'Secondary' })
    expect(button.className).toContain('border-home-border-hi')
    expect(button.className).toContain('bg-[#111621]')
  })

  it('applies the ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button', { name: 'Ghost' })
    expect(button.className).toContain('text-home-dim')
  })

  it('applies the sm size classes', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button', { name: 'Small' })
    expect(button.className).toContain('h-[30px]')
    expect(button.className).toContain('px-[12px]')
  })

  it('passes through disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  it('passes through type="submit"', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit')
  })

  it('forwards onClick and other native props', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Go</Button>)
    screen.getByRole('button', { name: 'Go' }).click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('appends a custom className last', () => {
    render(<Button className="extra-class">Extra</Button>)
    expect(screen.getByRole('button', { name: 'Extra' }).className).toContain('extra-class')
  })
})
