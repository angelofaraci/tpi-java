import { useState, useEffect } from 'react'
import { api } from './services/api'
import { Characters } from './Characters'
import './App.css'

interface LoginForm {
  username: string
  password: string
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loginForm, setLoginForm] = useState<LoginForm>({
    username: '',
    password: ''
  })
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // You might want to validate the token with your backend here
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoggingIn(true)

    try {
      console.log('Attempting login...')
      const response = await api.auth.login({
        username: loginForm.username,
        password: loginForm.password
      })
      console.log('Login response:', response)

      // Assuming the API returns a token
      if (response.token) {
        localStorage.setItem('token', response.token)
        setIsAuthenticated(true)
        setLoginForm({ username: '', password: '' })
      }
    } catch (err) {
      console.error('🚨 Login Error Details:', err)
      if (err instanceof Error) {
        if (err.message.includes('403') || err.message.includes('401')) {
          setError('Invalid username or password')
        } else if (err.message.includes('Failed to fetch')) {
          setError('Unable to connect to server. Please check if the backend is running.')
        } else if (err.message.includes('invalid JSON')) {
          setError('Backend returned invalid data. Check browser console for details.')
        } else {
          setError(`Error: ${err.message}`)
        }
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div>Loading...</div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div>
        <header className="app-header">
          <h1>D&D Character Sheet</h1>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </header>
        <Characters />
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>D&D Character Manager</h1>
        <h2>Login</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={loginForm.username}
              onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
              required
              disabled={isLoggingIn}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              required
              disabled={isLoggingIn}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoggingIn || !loginForm.username || !loginForm.password}
            className="login-button"
          >
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="register-link">
          <p>Don't have an account? <a href="#register">Register here</a></p>
        </div>
      </div>
    </div>
  )
}

export default App
