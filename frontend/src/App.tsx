import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { Login } from './pages/Login'
import { Characters } from './pages/Characters'
import { CreateCampaign } from './pages/CreateCampaign'
import { CreateCharacter } from './pages/CreateCharacter'
import { api } from './services/api'
import type { OwnedCampaignSummary } from './interfaces/campaign'
import './styles/CharacterSheet.css'

type View = 'home' | 'character-sheet' | 'create-campaign' | 'create-character'

interface CharacterCard {
  id: number
  name?: string
  level?: number
  alignment?: string
  race?: {
    name?: string
  }
}

interface AuthenticatedUser {
  id?: number | string
}

function formatCampaignStartDate(creationDate?: string) {
  if (!creationDate) {
    return 'Campaign start date unavailable'
  }

  const parsedDate = new Date(creationDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Campaign start date unavailable'
  }

  return `Campaign Started ${parsedDate.toLocaleDateString('en-US', { timeZone: 'UTC' })}`
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [view, setView] = useState<View>('home')
  const [characters, setCharacters] = useState<CharacterCard[]>([])
  const [campaigns, setCampaigns] = useState<OwnedCampaignSummary[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)
  const [loadingCharacters, setLoadingCharacters] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [charactersError, setCharactersError] = useState<string | null>(null)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [campaignFeedback, setCampaignFeedback] = useState<string | null>(null)
  const currentUserIdRef = useRef<number | null>(null)
  const latestCharacterRequestId = useRef(0)
  const latestCampaignRequestId = useRef(0)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  const loadCharacters = useCallback(async () => {
    const requestId = latestCharacterRequestId.current + 1
    latestCharacterRequestId.current = requestId
    setLoadingCharacters(true)
    setCharactersError(null)

    try {
      let data: unknown
      let resolvedUserId: number | null = currentUserIdRef.current

      if (!resolvedUserId) {
        try {
          const user = await api.auth.me() as AuthenticatedUser
          const userIdNum = user.id ? Number(user.id) : null

          if (userIdNum) {
            resolvedUserId = userIdNum
            setCurrentUserId(userIdNum)
          }
        } catch (meErr) {
          console.warn('Failed to resolve authenticated user, falling back to all characters', meErr)
        }
      }

      if (resolvedUserId) {
        data = await api.characters.findByUserId(resolvedUserId)
      } else {
        data = await api.characters.findAll()
      }

      if (requestId !== latestCharacterRequestId.current) {
        return
      }

      setCharacters(Array.isArray(data) ? (data as CharacterCard[]) : [])
    } catch (err: unknown) {
      if (requestId !== latestCharacterRequestId.current) {
        return
      }

      setCharactersError(err instanceof Error ? err.message : 'Failed to load characters')
    } finally {
      if (requestId === latestCharacterRequestId.current) {
        setLoadingCharacters(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    void loadCharacters()
  }, [isAuthenticated, loadCharacters])

  const loadCampaigns = useCallback(async () => {
    const requestId = latestCampaignRequestId.current + 1
    latestCampaignRequestId.current = requestId
    setLoadingCampaigns(true)
    setCampaignsError(null)

    try {
      const data = await api.campaigns.findMine()

      if (requestId !== latestCampaignRequestId.current) {
        return
      }

      setCampaigns(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      if (requestId !== latestCampaignRequestId.current) {
        return
      }

      setCampaignsError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      if (requestId === latestCampaignRequestId.current) {
        setLoadingCampaigns(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    loadCampaigns()
  }, [isAuthenticated, loadCampaigns])

  const handleLogout = () => {
    localStorage.removeItem('token')
    latestCharacterRequestId.current += 1
    latestCampaignRequestId.current += 1
    setIsAuthenticated(false)
    setCurrentUserId(null)
    setView('home')
    setSelectedCharacterId(null)
    setCharacters([])
    setCampaigns([])
    setCampaignFeedback(null)
    setCharactersError(null)
    setCampaignsError(null)
  }

  const handleViewCharacter = (characterId: number) => {
    setSelectedCharacterId(characterId)
    setView('character-sheet')
  }

  const handleBackToHome = () => {
    setView('home')
    setSelectedCharacterId(null)
  }

  const handleOpenCreateCampaign = () => {
    setCampaignFeedback(null)
    setView('create-campaign')
  }

  const handleOpenCreateCharacter = () => {
    setCampaignFeedback(null)
    setView('create-character')
  }

  const handleCancelCreateCampaign = () => {
    setView('home')
  }

  const handleCreateCampaignSuccess = (campaignName: string) => {
    setView('home')
    setCampaignFeedback(`Campaign "${campaignName}" created successfully. You are now the DM.`)
    void loadCampaigns()
  }

  const handleCancelCreateCharacter = () => {
    setView('home')
  }

  const handleCreateCharacterSuccess = (characterName: string) => {
    setView('home')
    setCampaignFeedback(`Character "${characterName}" created successfully.`)
    void loadCharacters()
  }

  if (!isAuthenticated) {
    return (
      <Login
        onAuthSuccess={() => {
          setIsAuthenticated(true)
          setView('home')
          setCampaignFeedback(null)
        }}
      />
    )
  }

  // Character Sheet View
  if (view === 'character-sheet' && selectedCharacterId) {
    return (
      <Characters
        characterId={selectedCharacterId}
        onBack={handleBackToHome}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'create-campaign') {
    return (
      <CreateCampaign
        onCancel={handleCancelCreateCampaign}
        onLogout={handleLogout}
        onSuccess={handleCreateCampaignSuccess}
      />
    )
  }

  if (view === 'create-character' && currentUserId) {
    return (
      <CreateCharacter
        currentUserId={currentUserId}
        onCancel={handleCancelCreateCharacter}
        onLogout={handleLogout}
        onSuccess={handleCreateCharacterSuccess}
      />
    )
  }

  // Main Home View
  return (
    <div>
      <header className="app-header">
        <h1>D&D Manager</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </header>

      <div className="app-shell">
        {campaignFeedback && (
          <div className="status-banner success-banner" role="status">
            <span>{campaignFeedback}</span>
            <button
              type="button"
              className="banner-dismiss-button"
              onClick={() => setCampaignFeedback(null)}
              aria-label="Dismiss campaign feedback"
            >
              x
            </button>
          </div>
        )}

        {/* Characters Section */}
        <section className="content-section">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Characters</h2>
              <p className="section-subtitle">Create a hero from the guided sheet-inspired flow or open an existing record.</p>
            </div>
            <button type="button" className="section-action-button" onClick={handleOpenCreateCharacter}>
              + Create Character
            </button>
          </div>
          {loadingCharacters && <div className="loading-container">Loading characters...</div>}
          {charactersError && <div className="error-message">{charactersError}</div>}
          {!loadingCharacters && !charactersError && (
            <div className="entity-grid">
              {characters.length === 0 ? (
                <button type="button" className="campaign-create-card character-create-card" onClick={handleOpenCreateCharacter}>
                  <span className="campaign-create-badge">Hero</span>
                  <h3>Forge your first adventurer</h3>
                  <p>Pick a campaign, race, class, and starting sheet values without leaving the home view flow.</p>
                  <span className="campaign-create-link">Open creator</span>
                </button>
              ) : (
                characters.map((character) => (
                  <div
                    key={character.id}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleViewCharacter(character.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-foreground-muted)'
                      e.currentTarget.style.transform = 'translateY(-4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Character Image/Header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1a4d2e 0%, #0f3a1f 100%)',
                      padding: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '0.375rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem'
                      }}>
                        🧙
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>
                          {character.name || 'Unnamed Character'}
                        </h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                          {character.level ? `Level ${character.level} | ` : ''}
                          {character.race?.name || 'No Species Selected'} | 
                          {character.alignment || 'No Classes Selected'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      padding: '1rem 1.5rem',
                      display: 'flex',
                      gap: '1rem',
                      borderTop: '1px solid var(--color-border)'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewCharacter(character.id)
                        }}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: 'transparent',
                          color: 'var(--color-foreground)',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-foreground-muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-foreground)'}
                      >
                        VIEW
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: 'transparent',
                          color: 'var(--color-foreground)',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-foreground-muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-foreground)'}
                      >
                        EDIT
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#ef4444'}
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Campaigns Section */}
        <section className="content-section">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Campaigns</h2>
              <p className="section-subtitle">Create a new table and manage it as the assigned Dungeon Master.</p>
            </div>
            <button type="button" className="section-action-button" onClick={handleOpenCreateCampaign}>
              + Create Campaign
            </button>
          </div>

          <div className="entity-grid">
            <button type="button" className="campaign-create-card" onClick={handleOpenCreateCampaign}>
              <span className="campaign-create-badge">New</span>
              <h3>Start a fresh adventure</h3>
              <p>Set the campaign name, description, and privacy in one step.</p>
              <span className="campaign-create-link">Open creator</span>
            </button>

            {loadingCampaigns && (
              <div className="campaign-section-message" role="status">
                Loading campaigns...
              </div>
            )}

            {!loadingCampaigns && campaignsError && (
              <div className="error-message campaign-section-message">{campaignsError}</div>
            )}

            {!loadingCampaigns && !campaignsError && campaigns.length === 0 && (
              <div className="campaign-section-message campaign-section-empty">
                You are not DM of any campaigns yet.
              </div>
            )}

            {!loadingCampaigns && !campaignsError && campaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-placeholder-card">
                <div style={{
                  backgroundColor: 'var(--color-background)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center'
                }}>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.5rem',
                    fontWeight: 'normal',
                    color: 'var(--color-foreground)'
                  }}>
                    {campaign.name}
                  </h3>
                  <p style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: '0.875rem',
                    color: 'var(--color-foreground-muted)'
                  }}>
                    {formatCampaignStartDate(campaign.creationDate)}
                  </p>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: 'bold',
                      color: 'var(--color-foreground)',
                      marginBottom: '0.25rem'
                    }}>
                      {campaign.playerCount}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-foreground-muted)',
                      fontWeight: '600'
                    }}>
                      PLAYERS
                    </div>
                  </div>

                  <div style={{
                    padding: '0.75rem 0',
                    borderTop: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      color: 'var(--color-foreground)',
                      letterSpacing: '0.05em'
                    }}>
                      ROLE: DUNGEON MASTER
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '1rem'
                  }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        color: '#3b82f6',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        transition: 'color 0.2s',
                        letterSpacing: '0.05em'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#60a5fa'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
                    >
                      VIEW CAMPAIGN
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        transition: 'color 0.2s',
                        letterSpacing: '0.05em'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#ef4444'}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
