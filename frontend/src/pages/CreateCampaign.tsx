import { useState, type FormEvent } from 'react'
import type { CreateCampaignPayload } from '../interfaces/campaign'
import { api } from '../services/api'
import { Button } from '../components/ui/Button'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'

interface CreatedCampaignResult {
  campaignName: string
  joinCode?: string
}

interface CreateCampaignProps {
  onCancel: () => void
  onLogout: () => void
  onSuccess: (result: CreatedCampaignResult) => void
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
      const created = await api.campaigns.create({
        name: campaignName,
        description: formState.description.trim(),
        privacy: formState.privacy,
      })

      setFormState(defaultFormState)
      setFieldErrors({})
      onSuccess({ campaignName, joinCode: created?.joinCode })
    } catch (error) {
      setSubmitError(getSubmitErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-home-ink-900 text-home-text" style={{ fontFamily: 'var(--font-home-display)' }}>
      <header className="flex h-[58px] items-center justify-between border-b border-home-line bg-home-ink-800 px-[26px]">
        <h1
          onClick={onCancel}
          className="cursor-pointer font-home-display text-[12.5px] font-bold uppercase text-home-text-strong"
        >
          D&D Manager
        </h1>
        <button
          onClick={onLogout}
          type="button"
          className="text-[12px] text-home-dim transition-colors duration-150 hover:text-home-text-soft"
        >
          Logout
        </button>
      </header>

      <div className="px-[26px] py-[16px]">
        <button
          className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
          onClick={onCancel}
          type="button"
        >
          ← Cancel
        </button>
      </div>

      <div className="px-[26px] pb-[28px]">
        <div className="mx-auto max-w-[720px] rounded-home-3xl border border-home-border bg-home-surface p-[22px_24px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]">
          <div className="mb-[24px]">
            <h2 className="font-home-display text-[20px] font-semibold leading-[1.15] tracking-[-.01em] text-home-text-strong">
              Create Campaign
            </h2>
            <p className="mt-[8px] text-[12.5px] leading-[1.5] text-home-muted">
              Start a new campaign and the backend will assign the authenticated user as DM.
            </p>
          </div>

          {submitError && (
            <div data-testid="create-campaign-error" className="mb-[16px] rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]">
              {submitError}
            </div>
          )}

          <form data-testid="create-campaign-form" onSubmit={handleSubmit} noValidate>
            <FormField id="campaign-name" label="Campaign Name">
              <Input
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
                invalid={Boolean(fieldErrors.name)}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'campaign-name-error' : undefined}
              />
              {fieldErrors.name && (
                <p
                  id="campaign-name-error"
                  role="alert"
                  className="mt-[5px] block text-[11.5px] text-home-danger"
                >
                  {fieldErrors.name}
                </p>
              )}
            </FormField>

            <FormField id="campaign-description" label="Description">
              <textarea
                id="campaign-description"
                value={formState.description}
                onChange={(event) => {
                  setFormState((current) => ({ ...current, description: event.target.value }))
                  setSubmitError(null)
                }}
                disabled={isSubmitting}
                rows={6}
                className="min-h-[80px] w-full resize-y rounded-home-lg border border-home-border-mid bg-home-well px-[11px] py-[8px] text-[12.5px] text-home-text outline-none transition-colors duration-150 placeholder:text-home-placeholder focus:border-home-border-acc disabled:opacity-50"
              />
            </FormField>

            <div className="mb-[14px] flex items-center gap-[10px]">
              <input
                id="campaign-privacy"
                type="checkbox"
                checked={formState.privacy}
                onChange={(event) => {
                  setFormState((current) => ({ ...current, privacy: event.target.checked }))
                  setSubmitError(null)
                }}
                disabled={isSubmitting}
                className="h-[16px] w-[16px] rounded-home-md border border-home-border-mid bg-home-well accent-home-blue-600 disabled:opacity-50"
              />
              <label htmlFor="campaign-privacy" className="text-[12.5px] text-home-muted">
                Private campaign
              </label>
            </div>

            <div className="mt-[20px] flex justify-end gap-[10px]">
              <Button data-testid="create-campaign-cancel" type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button data-testid="create-campaign-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
