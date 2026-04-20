import { useState, useEffect } from 'react'
import '../App.css'
import { api } from '../services/api'
import { CopyCodeButton } from '../components/CopyCodeButton'
import type { Campaign, CampaignParticipant, CampaignCharacterReference } from '../interfaces/campaign'

interface ViewCampaignProps {
  campaignId: number
  isDungeonMaster: boolean
  onBack: () => void
  onLogout: () => void
  onDeleteCampaign: (campaignId: number, campaignName: string) => void
  deletingCampaignId: number | null
  deleteError: string | null
  feedback?: string | null
  onDismissFeedback?: () => void
  onViewCharacter?: (characterId: number) => void
  onEditCharacter?: (characterId: number) => void
}

function formatDate(dateString?: string) {
  if (!dateString) {
    return 'Date unavailable'
  }

  const parsed = new Date(dateString)

  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable'
  }

  return parsed.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function ViewCampaign({
  campaignId,
  isDungeonMaster,
  onBack,
  onLogout,
  onDeleteCampaign,
  deletingCampaignId,
  deleteError,
  feedback,
  onDismissFeedback,
  onViewCharacter,
  onEditCharacter,
}: ViewCampaignProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await api.campaigns.findById(campaignId)

        if (!data || typeof data !== 'object') {
          setError('Malformed campaign payload')
          return
        }

        setCampaign(data)
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('403')) {
          setForbidden(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load campaign')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCampaign()
  }, [campaignId])

  if (loading) {
    return <div className="loading-container">Loading campaign...</div>
  }

  if (forbidden) {
    return (
      <div>
        <header className="app-header">
          <h1 onClick={onBack} style={{ cursor: 'pointer' }}>D&D Manager</h1>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </header>
        <div style={{ padding: '2rem' }}>
          <button className="link-button" onClick={onBack}>← Back to Home</button>
          <div className="error-message" style={{ marginTop: '1rem' }}>
            🔒 This campaign is private. You need to be the Dungeon Master or an active player to view it.
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <header className="app-header">
          <h1 onClick={onBack} style={{ cursor: 'pointer' }}>D&D Manager</h1>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </header>
        <div style={{ padding: '2rem' }}>
          <button className="link-button" onClick={onBack}>← Back to Home</button>
          <div className="error-message" style={{ marginTop: '1rem' }}>Error: {error}</div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  const players: CampaignParticipant[] = campaign.players ?? []
  const characters: CampaignCharacterReference[] = campaign.characters ?? []

  return (
    <div>
      <header className="app-header">
        <h1 onClick={onBack} style={{ cursor: 'pointer' }}>D&D Manager</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>

      <div style={{ padding: '1rem 2rem' }}>
        <button className="link-button" onClick={onBack}>← Back to Home</button>

        {feedback && (
          <div className="status-banner success-banner" role="status" style={{ marginTop: '1rem' }}>
            <span>{feedback}</span>
            {onDismissFeedback && (
              <button
                type="button"
                className="banner-dismiss-button"
                onClick={onDismissFeedback}
                aria-label="Dismiss campaign feedback"
              >
                x
              </button>
            )}
          </div>
        )}

        {deleteError && <div className="error-message" style={{ marginTop: '1rem' }}>{deleteError}</div>}
      </div>

      <div className="view-campaign-sheet">
        {/* DM Actions */}
        {isDungeonMaster && (
          <div className="sheet-actions-row">
            <button
              type="button"
              className="sheet-delete-button sheet-hero-action-button"
              onClick={() => onDeleteCampaign(campaignId, campaign.name)}
              disabled={deletingCampaignId === campaignId}
            >
              {deletingCampaignId === campaignId ? 'Deleting...' : 'Delete Campaign'}
            </button>
          </div>
        )}

        {/* Campaign Header */}
        <div className="view-campaign-hero">
          <div className="view-campaign-hero-content">
            <span className="campaign-create-badge">{campaign.privacy ? 'Private' : 'Public'}</span>
            <h2 className="view-campaign-title">{campaign.name}</h2>
            <p className="view-campaign-date">{formatDate(campaign.creationDate)}</p>
            {campaign.description && (
              <p className="view-campaign-description">{campaign.description}</p>
            )}
            {isDungeonMaster && campaign.joinCode && (
              <div className="view-campaign-join-code">
                <span className="view-campaign-join-code-label">JOIN CODE</span>
                <span className="view-campaign-join-code-value">{campaign.joinCode}</span>
                <CopyCodeButton code={campaign.joinCode} size="sm" variant="dark" />
              </div>
            )}
          </div>

          <div className="view-campaign-stats-row">
            <div className="view-campaign-stat-card">
              <div className="view-campaign-stat-value">{players.length}</div>
              <div className="view-campaign-stat-label">PLAYERS</div>
            </div>
            <div className="view-campaign-stat-card">
              <div className="view-campaign-stat-value">{characters.length}</div>
              <div className="view-campaign-stat-label">CHARACTERS</div>
            </div>
          </div>

          {isDungeonMaster && (
            <div className="view-campaign-role-strip">
              <span>ROLE: DUNGEON MASTER</span>
            </div>
          )}
        </div>

        {/* Campaign Content */}
        <div className="view-campaign-columns">
          {/* Players Section */}
          <section className="view-campaign-panel">
            <h3>Players</h3>
            {players.length === 0 ? (
              <p className="view-campaign-empty">No players have joined this campaign yet.</p>
            ) : (
              <ul className="view-campaign-list">
                {players.map((player) => (
                  <li key={player.id} className="view-campaign-list-item">
                    <div className="view-campaign-list-icon">🧑</div>
                    <div>
                      <div className="view-campaign-list-primary">
                        {player.username || `Player #${player.id}`}
                      </div>
                      {player.email && (
                        <div className="view-campaign-list-secondary">{player.email}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Characters Section */}
          <section className="view-campaign-panel">
            <h3>Characters</h3>
            {characters.length === 0 ? (
              <p className="view-campaign-empty">No characters assigned to this campaign yet.</p>
            ) : (
              <ul className="view-campaign-list">
                {characters.map((character) => (
                  <li key={character.id} className="view-campaign-list-item">
                    <div className="view-campaign-list-icon">🧙</div>
                    <div style={{ flex: 1 }}>
                      <div className="view-campaign-list-primary">
                        {character.name || `Character #${character.id}`}
                      </div>
                      <div className="view-campaign-list-secondary">
                        {[
                          character.race?.name,
                          character.alignment,
                        ].filter(Boolean).join(' · ')}
                      </div>
                      {character.user?.username && (
                        <div className="view-campaign-list-secondary">
                          Player: {character.user.username}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {onViewCharacter && (
                        <button
                          type="button"
                          title="View Sheet"
                          aria-label="View character sheet"
                          onClick={() => onViewCharacter(character.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '0.375rem',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'transparent',
                            color: 'var(--color-foreground-muted)',
                            cursor: 'pointer',
                            transition: 'color 0.2s, border-color 0.2s, background-color 0.2s',
                            padding: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#60a5fa'
                            e.currentTarget.style.borderColor = '#60a5fa'
                            e.currentTarget.style.backgroundColor = 'rgba(96,165,250,0.08)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-foreground-muted)'
                            e.currentTarget.style.borderColor = 'var(--color-border)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          {/* Eye icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      )}
                      {isDungeonMaster && onEditCharacter && (
                        <button
                          type="button"
                          title="Edit Character"
                          aria-label="Edit character"
                          onClick={() => onEditCharacter(character.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '0.375rem',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'transparent',
                            color: 'var(--color-foreground-muted)',
                            cursor: 'pointer',
                            transition: 'color 0.2s, border-color 0.2s, background-color 0.2s',
                            padding: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#a78bfa'
                            e.currentTarget.style.borderColor = '#a78bfa'
                            e.currentTarget.style.backgroundColor = 'rgba(167,139,250,0.08)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-foreground-muted)'
                            e.currentTarget.style.borderColor = 'var(--color-border)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          {/* Pencil icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                            <path d="m15 5 4 4"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
