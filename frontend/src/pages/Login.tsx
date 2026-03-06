import { useEffect, useState } from 'react'
import { api } from '../services/api'
import '../App.css'

interface AuthResponse {
  token?: string
}

interface LoginForm {
  username: string
  password: string
}

interface RegisterForm {
  email: string
  username: string
  password: string
  confirmPassword: string
}

export function Login({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [loginForm, setLoginForm] = useState<LoginForm>({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [isRegistering, setIsRegistering] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    // If already authenticated, notify parent
    const token = localStorage.getItem('token')
    if (token) {
      onAuthSuccess()
    }
  }, [onAuthSuccess])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoggingIn(true)

    try {
      const response = await api.auth.login({
        username: loginForm.username,
        password: loginForm.password
      }) as AuthResponse

      if (response.token) {
        localStorage.setItem('token', response.token)
        onAuthSuccess()
        setLoginForm({ username: '', password: '' })
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('403') || err.message.includes('401')) {
          setError('Invalid username or password')
        } else if (err.message.includes('Failed to fetch')) {
          setError('Unable to connect to server. Please check if the backend is running.')
        } else if (err.message.toLowerCase().includes('invalid json')) {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsRegistering(true)

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match')
      setIsRegistering(false)
      return
    }
    if (registerForm.password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsRegistering(false)
      return
    }

    try {
      const response = await api.auth.register({
        email: registerForm.email,
        username: registerForm.username,
        password: registerForm.password
      }) as AuthResponse

      if (response.token) {
        localStorage.setItem('token', response.token)
        onAuthSuccess()
      } else {
        setShowRegister(false)
        setLoginForm({ username: registerForm.username, password: '' })
      }
      setRegisterForm({ email: '', username: '', password: '', confirmPassword: '' })
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('409')) {
          setError('Username or email already exists')
        } else if (err.message.includes('Failed to fetch')) {
          setError('Unable to connect to server. Please check if the backend is running.')
        } else if (err.message.toLowerCase().includes('invalid json')) {
          setError('Backend returned invalid data. Check browser console for details.')
        } else {
          setError(`Error: ${err.message}`)
        }
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>D&D Character Manager</h1>
        <h2>{showRegister ? 'Register' : 'Login'}</h2>

        {error && <div className="error-message">{error}</div>}

        {!showRegister && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-username">Username:</label>
              <input
                type="text"
                id="login-username"
                value={loginForm.username}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                required
                disabled={isLoggingIn}
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password:</label>
              <input
                type="password"
                id="login-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
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
        )}

        {showRegister && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="reg-email">Email:</label>
              <input
                type="email"
                id="reg-email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                disabled={isRegistering}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-username">Username:</label>
              <input
                type="text"
                id="reg-username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, username: e.target.value }))}
                required
                disabled={isRegistering}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-password">Password:</label>
              <input
                type="password"
                id="reg-password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                disabled={isRegistering}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-confirm">Confirm Password:</label>
              <input
                type="password"
                id="reg-confirm"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
                disabled={isRegistering}
              />
            </div>
            <button
              type="submit"
              disabled={
                isRegistering ||
                !registerForm.email ||
                !registerForm.username ||
                !registerForm.password ||
                !registerForm.confirmPassword
              }
              className="login-button"
            >
              {isRegistering ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}

        <div className="register-link">
          {showRegister ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setShowRegister(false)
                  setError(null)
                }}
                className="link-button"
              >
                Login here
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setShowRegister(true)
                  setError(null)
                }}
                className="link-button"
              >
                Register here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
