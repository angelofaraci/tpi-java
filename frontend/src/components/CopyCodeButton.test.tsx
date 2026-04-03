import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyCodeButton } from './CopyCodeButton'

describe('CopyCodeButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the clipboard icon button with the correct title', () => {
    render(<CopyCodeButton code="AB12-CD34" />)
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
  })

  it('copies the code to the clipboard when clicked', async () => {
    render(<CopyCodeButton code="AB12-CD34" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    await act(async () => { await Promise.resolve() })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('AB12-CD34')
  })

  it('changes title to Copied! after clicking', async () => {
    render(<CopyCodeButton code="AB12-CD34" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    await act(async () => { await Promise.resolve() })
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
  })

  it('reverts back to the clipboard icon after 2 seconds', async () => {
    render(<CopyCodeButton code="AB12-CD34" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    await act(async () => { await Promise.resolve() })
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
  })

  it('renders with size md without crashing', () => {
    render(<CopyCodeButton code="XY99-ZZ00" size="md" />)
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
  })

  it('renders with dark variant without crashing', () => {
    render(<CopyCodeButton code="XY99-ZZ00" variant="dark" />)
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
  })
})
