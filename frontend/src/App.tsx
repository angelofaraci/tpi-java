import { useState, useEffect } from 'react'
import './App.css'
import { Login } from './pages/Login'
import { Characters } from './pages/Characters'
import { api } from './services/api'
import './styles/CharacterSheet.css'

type View = 'home' | 'character-sheet'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [view, setView] = useState<View>('home')
  const [characters, setCharacters] = useState<any[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)
  const [loadingCharacters, setLoadingCharacters] = useState(false)
  const [charactersError, setCharactersError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  // Fetch user's characters when authenticated
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchCharacters = async () => {
      setLoadingCharacters(true)
      setCharactersError(null)
      try {
        let data: any
        try {
          const user = await api.auth.me()
          const userIdNum = user.id
          if (userIdNum) {
            data = await api.characters.findByUserId(Number(userIdNum))
          } else {
            data = await api.characters.findAll()
          }
        } catch (meErr) {
          console.warn('Failed to fetch user characters, falling back to findAll', meErr)
          data = await api.characters.findAll()
        }

        setCharacters(Array.isArray(data) ? data : [])
      } catch (err: any) {
        setCharactersError(err?.message || 'Failed to load characters')
      } finally {
        setLoadingCharacters(false)
      }
    }

    fetchCharacters()
  }, [isAuthenticated])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setView('home')
  }

  const handleViewCharacter = (characterId: number) => {
    setSelectedCharacterId(characterId)
    setView('character-sheet')
  }

  const handleBackToHome = () => {
    setView('home')
    setSelectedCharacterId(null)
  }

  if (!isAuthenticated) {
    return <Login onAuthSuccess={() => setIsAuthenticated(true)} />
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

  // Main Home View
  return (
    <div>
      <header className="app-header">
        <h1>D&D Manager</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </header>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Characters Section */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Characters</h2>
          {loadingCharacters && <div className="loading-container">Loading characters...</div>}
          {charactersError && <div className="error-message">{charactersError}</div>}
          {!loadingCharacters && !charactersError && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
              {characters.length === 0 ? (
                <p style={{ color: 'var(--color-foreground-muted)' }}>No characters yet.</p>
              ) : (
                characters.map((character: any) => (
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
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Campaigns</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {/* Hardcoded Campaign Placeholder */}
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
              }}
            >
              {/* Campaign Header */}
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
                  Intro to Stormwreck Isle
                </h3>
                <p style={{ 
                  margin: '0 0 1.5rem 0', 
                  fontSize: '0.875rem', 
                  color: 'var(--color-foreground-muted)' 
                }}>
                  Campaign Started 11/29/2025
                </p>
                
                {/* Players Count */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ 
                    fontSize: '2.5rem', 
                    fontWeight: 'bold',
                    color: 'var(--color-foreground)',
                    marginBottom: '0.25rem'
                  }}>
                    0
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem',
                    color: 'var(--color-foreground-muted)',
                    fontWeight: '600'
                  }}>
                    PLAYERS
                  </div>
                </div>

                {/* Role */}
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

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '1rem'
                }}>
                  <button
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
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
