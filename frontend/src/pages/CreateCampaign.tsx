import { useState, type FormEvent } from 'react'
import '../App.css'
import type { CreateCampaignPayload } from '../interfaces/campaign'
import { api } from '../services/api'

interface CreateCampaignProps {
  onCancel: () => void
  onLogout: () => void
  onSuccess: (campaignName: string) => void
}

interface CampaignFormErrors {
  name?: string
}

const defaultFormState: CreateCampaignPayload = {
  name: '',
  description: '',
  privacy: false,
}

function getSubmitErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred'
  }

  if (error.message.includes('Failed to fetch')) {
    return 'Unable to connect to server. Please check if the backend is running.'
  }

  if (error.message.toLowerCase().includes('invalid json')) {
    return 'Backend returned invalid data. Check browser console for details.'
  }

  return `Error: ${error.message}`
}

export function CreateCampaign({ onCancel, onLogout, onSuccess }: CreateCampaignProps) {
  const [formState, setFormState] = useState<CreateCampaignPayload>(defaultFormState)
  const [fieldErrors, setFieldErrors] = useState<CampaignFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const nextErrors: CampaignFormErrors = {}

    if (!formState.name.trim()) {
      nextErrors.name = 'Campaign name is required'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    const campaignName = formState.name.trim()

    try {
      await api.campaigns.create({
        name: campaignName,
        description: formState.description.trim(),
        privacy: formState.privacy,
      })

      setFormState(defaultFormState)
      setFieldErrors({})
      onSuccess(campaignName)
    } catch (error) {
      setSubmitError(getSubmitErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <header className="app-header">
        <h1>D&D Manager</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>

      <div className="page-toolbar">
        <button className="link-button" onClick={onCancel} type="button">
          ← Cancel
        </button>
      </div>

      <div className="create-campaign-page">
        <div className="create-campaign-card">
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>Create Campaign</h2>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--color-foreground-muted)' }}>
              Start a new campaign and the backend will assign the authenticated user as DM.
            </p>
          </div>

          {submitError && <div className="error-message">{submitError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="campaign-name">Campaign Name</label>
              <input
                id="campaign-name"
                type="text"
                value={formState.name}
                onChange={(event) => {
                  setFormState((current) => ({ ...current, name: event.target.value }))
                  setFieldErrors((current) => ({ ...current, name: undefined }))
                  setSubmitError(null)
                }}
                disabled={isSubmitting}
                maxLength={100}
                required
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'campaign-name-error' : undefined}
              />
              {fieldErrors.name && (
                <p
                  id="campaign-name-error"
                  role="alert"
                  style={{ margin: '0.5rem 0 0', color: '#fca5a5', fontSize: '0.875rem' }}
                >
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="campaign-description">Description</label>
              <textarea
                id="campaign-description"
                value={formState.description}
                onChange={(event) => {
                  setFormState((current) => ({ ...current, description: event.target.value }))
                  setSubmitError(null)
                }}
                disabled={isSubmitting}
                rows={6}
                className="form-textarea"
              />
            </div>

            <div className="checkbox-row">
              <input
                id="campaign-privacy"
                type="checkbox"
                checked={formState.privacy}
                onChange={(event) => {
                  setFormState((current) => ({ ...current, privacy: event.target.checked }))
                  setSubmitError(null)
                }}
                disabled={isSubmitting}
              />
              <label htmlFor="campaign-privacy" style={{ margin: 0 }}>
                Private campaign
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="logout-button"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type="submit" className="login-button form-submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
