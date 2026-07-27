import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Home } from './Home'

const defaultProps = {
  username: 'pancho',
  userRole: 'ROLE_USER' as const,
  onLogout: vi.fn(),
}

describe('Home — top bar', () => {
  it('renders the brand wordmark and nav items', () => {
    render(<Home {...defaultProps} />)

    expect(screen.getByText('D&D MANAGER')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Characters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Campaigns' })).toBeInTheDocument()
  })

  it('marks Home as the active nav item by default', () => {
    render(<Home {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Characters' })).not.toHaveAttribute('aria-current')
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

  it('renders an inert search field that is not wired to any handler', async () => {
    const user = userEvent.setup()
    render(<Home {...defaultProps} />)

    const search = screen.getByPlaceholderText('Search or paste join code')
    expect(search).toBeInTheDocument()

    // Uncontrolled + unhandled: typing must not throw, call any prop, or
    // trigger navigation/filtering — there is no search logic in this change.
    await user.type(search, 'curse of strahd')
    expect(search).toHaveValue('curse of strahd')
    expect(defaultProps.onLogout).not.toHaveBeenCalled()
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
