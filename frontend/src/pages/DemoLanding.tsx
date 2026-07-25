import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { DemoCampaignSummary, DemoCharacterSummary } from '../interfaces/demo'
import '../App.css'

interface DemoLandingProps {
  onLoginRequest: () => void
  onSelectCharacter: (characterId: number) => void
}

export function DemoLanding({ onLoginRequest, onSelectCharacter }: DemoLandingProps) {
  const [campaigns, setCampaigns] = useState<DemoCampaignSummary[]>([])
  const [characters, setCharacters] = useState<DemoCharacterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadDemoData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [campaignsResult, charactersResult] = await Promise.all([
          api.demo.campaigns(),
          api.demo.characters(),
        ])

        if (cancelled) return

        setCampaigns(Array.isArray(campaignsResult) ? campaignsResult : [])
        setCharacters(Array.isArray(charactersResult) ? charactersResult : [])
      } catch {
        if (cancelled) return

        setError('Demo data is currently unavailable. Please try again later, or log in / sign up to start your own adventure.')
        setCampaigns([])
        setCharacters([])
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDemoData()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <header className="app-header">
        <h1>D&D Manager</h1>
        <button type="button" className="section-action-button" onClick={onLoginRequest}>
          Log In / Sign Up
        </button>
      </header>

      <div className="app-shell">
        <section className="content-section">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Try it out</h2>
              <p className="section-subtitle">
                Browse a sample campaign and a couple of ready-made characters before creating your own account.
              </p>
            </div>
          </div>

          {loading && <div className="loading-container">Loading demo content...</div>}

          {!loading && error && <div className="error-message">{error}</div>}

          {!loading && !error && (
            <>
              <div className="entity-grid">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="campaign-placeholder-card">
                    <div style={{ backgroundColor: 'var(--color-background)', padding: '2rem 1.5rem', textAlign: 'center' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 'normal', color: 'var(--color-foreground)' }}>
                        {campaign.name}
                      </h3>
                      {campaign.description && (
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
                          {campaign.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="section-header" style={{ marginTop: '2rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Sample characters</h2>
                </div>
              </div>

              {characters.length === 0 ? (
                <div className="campaign-section-message campaign-section-empty">
                  No demo characters are available right now. Log in or sign up to create your own.
                </div>
              ) : (
                <div className="entity-grid">
                  {characters.map((character) => (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => onSelectCharacter(character.id)}
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: 0,
                      }}
                    >
                      <div style={{
                        background: 'linear-gradient(135deg, #1a4d2e 0%, #0f3a1f 100%)',
                        padding: '1.5rem',
                      }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>{character.name}</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                          {character.level ? `Level ${character.level} | ` : ''}
                          {character.raceName || 'No Species Selected'} | {character.alignment || 'No Alignment'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
