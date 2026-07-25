import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { DemoCampaignDetail as DemoCampaignDetailData } from '../interfaces/demo'
import '../App.css'

interface DemoCampaignDetailProps {
  campaignId: number
  onBack: () => void
  onSelectCharacter: (characterId: number) => void
}

export function DemoCampaignDetail({ campaignId, onBack, onSelectCharacter }: DemoCampaignDetailProps) {
  const [campaign, setCampaign] = useState<DemoCampaignDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadCampaign = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await api.demo.campaignById(campaignId)
        if (cancelled) return
        setCampaign(result)
      } catch {
        if (cancelled) return
        setError('This demo campaign is unavailable.')
        setCampaign(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCampaign()

    return () => {
      cancelled = true
    }
  }, [campaignId])

  return (
    <div>
      <header className="app-header">
        <h1>D&D Manager</h1>
        <button type="button" className="section-action-button" onClick={onBack}>
          Back
        </button>
      </header>

      <div className="app-shell">
        <section className="content-section">
          {loading && <div className="loading-container">Loading campaign...</div>}

          {!loading && error && <div className="error-message">{error}</div>}

          {!loading && !error && campaign && (
            <>
              <div className="section-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{campaign.name}</h2>
                  {campaign.description && (
                    <p className="section-subtitle">{campaign.description}</p>
                  )}
                  {campaign.creationDate && (
                    <p className="section-subtitle">
                      Created {new Date(campaign.creationDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="section-header" style={{ marginTop: '2rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Characters</h2>
                </div>
              </div>

              {campaign.characters.length === 0 ? (
                <div className="campaign-section-message campaign-section-empty">
                  No characters in this demo campaign yet.
                </div>
              ) : (
                <div className="entity-grid">
                  {campaign.characters.map((character) => (
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
