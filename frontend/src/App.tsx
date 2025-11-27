import { useState, useEffect } from 'react'
import './App.css'
import { Characters } from './pages/Characters'
import { Campaigns } from './pages/Campaigns'
import { Login } from './pages/Login'
import { api } from './services/api'

type View = 'home' | 'characters' | 'campaigns'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [view, setView] = useState<View>('home')
  const [characters, setCharacters] = useState<any[]>([])
  const [loadingCharacters, setLoadingCharacters] = useState(false)
  const [charactersError, setCharactersError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  // Fetch user's characters when authenticated or when returning to home view
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchCharacters = async () => {
      setLoadingCharacters(true)
      setCharactersError(null)
      try {
        // Try to get the current user from /auth/me and then fetch their characters
        let data: any
        try {
          const user = await api.auth.me()
          console.log('Fetched user from /auth/me:', user)
          const userIdNum = user.id
          console.log('Extracted userId:', userIdNum)
          if (userIdNum) {
            data = await api.characters.findByUserId(Number(userIdNum))
          } else {
            // If user object doesn't include id for some reason, fallback to all
            data = await api.characters.findAll()
          }
        } catch (meErr) {
          // If /auth/me fails (unexpected), fallback to findAll so UI remains usable
          console.warn('Failed to fetch /auth/me, falling back to characters.findAll', meErr)
          data = await api.characters.findAll()
        }

        setCharacters(Array.isArray(data) ? data : [])
      } catch (err: any) {
        setCharactersError(err?.message || 'Failed to load characters')
      } finally {
        setLoadingCharacters(false)
      }
    }

    // Only fetch when on the home view so switching to the dedicated Characters page
    // doesn't trigger duplicate work (that page may fetch on its own).
    if (view === 'home') fetchCharacters()
  }, [isAuthenticated, view])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setView('home')
  }

  if (!isAuthenticated) {
    return <Login onAuthSuccess={() => setIsAuthenticated(true)} />
  }

  return (
    <div>
      <header className="app-header">
        <h1>D&D Manager</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </header>

      {view === 'home' && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="login-button" onClick={() => setView('characters')}>Characters</button>
            <button className="login-button" onClick={() => setView('campaigns')}>Campaigns</button>
          </div>

          <div style={{ marginTop: '1.5rem', width: '90%', maxWidth: 800 }}>
            <h2>Your Characters</h2>
            {loadingCharacters && <p>Loading characters...</p>}
            {charactersError && <p style={{ color: 'red' }}>{charactersError}</p>}
            {!loadingCharacters && !charactersError && (
              <>
                {characters.length === 0 ? (
                  <p>You don't have any characters yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {characters.map((c: any) => (
                      <li key={c.id} style={{ borderBottom: '1px solid #eee', padding: '0.5rem 0' }}>
                        <strong>{c.name ?? 'Unnamed'}</strong>
                        {c.race && <span> — {c.race.name ?? c.race}</span>}
                        {c.level && <span> (Lvl {c.level})</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {view === 'characters' && (
        <div>
          <button className="link-button" onClick={() => setView('home')}>← Back</button>
          <Characters />
        </div>
      )}

      {view === 'campaigns' && (
        <div>
          <button className="link-button" onClick={() => setView('home')}>← Back</button>
          <Campaigns />
        </div>
      )}
    </div>
  )
}

export default App
