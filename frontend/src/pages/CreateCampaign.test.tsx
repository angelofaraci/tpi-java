import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../services/api'
import { CreateCampaign } from './CreateCampaign'

vi.mock('../services/api', () => ({
  api: {
    campaigns: {
      create: vi.fn(),
    },
  },
}))

describe('CreateCampaign', () => {
  const onCancel = vi.fn()
  const onLogout = vi.fn()
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows required validation when the campaign name is blank', async () => {
    const user = userEvent.setup()

    render(<CreateCampaign onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    await user.click(screen.getByRole('button', { name: 'Create Campaign' }))

    expect(await screen.findByText('Campaign name is required')).toBeInTheDocument()
    expect(api.campaigns.create).not.toHaveBeenCalled()
  })

  it('preserves form data and shows feedback when creation fails', async () => {
    const user = userEvent.setup()

    vi.mocked(api.campaigns.create).mockRejectedValueOnce(new Error('Error 500: Backend failed'))

    render(<CreateCampaign onCancel={onCancel} onLogout={onLogout} onSuccess={onSuccess} />)

    const nameInput = screen.getByLabelText('Campaign Name')
    const descriptionInput = screen.getByLabelText('Description')
    const privacyInput = screen.getByLabelText('Private campaign')

    await user.type(nameInput, ' Lost Mines ')
    await user.type(descriptionInput, 'Goblin ambushes everywhere')
    await user.click(privacyInput)
    await user.click(screen.getByRole('button', { name: 'Create Campaign' }))

    expect(await screen.findByText('Error: Error 500: Backend failed')).toBeInTheDocument()
    expect(nameInput).toHaveValue(' Lost Mines ')
    expect(descriptionInput).toHaveValue('Goblin ambushes everywhere')
    expect(privacyInput).toBeChecked()
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
