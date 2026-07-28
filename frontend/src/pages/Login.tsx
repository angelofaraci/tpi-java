import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/ui/Button'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'

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

  const passwordMismatch =
    registerForm.confirmPassword.length > 0 &&
    registerForm.password !== registerForm.confirmPassword

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
    <div
      className="grid min-h-screen place-items-center bg-home-ink-900 p-[24px] text-home-text"
      style={{ fontFamily: 'var(--font-home-display)' }}
    >
      <div className="w-full max-w-[400px] rounded-home-3xl border border-home-border bg-home-surface p-[22px_24px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]">
        <h1 className="mb-[8px] font-home-mono text-[10px] tracking-[.18em] text-[#5b6deb]">
          D&D Character Manager
        </h1>
        <h2 className="font-home-display text-[20px] font-semibold leading-[1.15] tracking-[-.01em] text-home-text-strong">
          {showRegister ? 'Register' : 'Login'}
        </h2>

        {error && (
          <div className="mt-[16px] rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]">
            {error}
          </div>
        )}

        {!showRegister && (
          <form onSubmit={handleLogin} className="mt-[20px]">
            <FormField id="login-username" label="Username:">
              <Input
                type="text"
                id="login-username"
                value={loginForm.username}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                required
                disabled={isLoggingIn}
              />
            </FormField>
            <FormField id="login-password" label="Password:">
              <Input
                type="password"
                id="login-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                disabled={isLoggingIn}
              />
            </FormField>
            <Button type="submit" disabled={isLoggingIn || !loginForm.username || !loginForm.password}>
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        )}

        {showRegister && (
          <form onSubmit={handleRegister} className="mt-[20px]">
            <FormField id="reg-email" label="Email:">
              <Input
                type="email"
                id="reg-email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                disabled={isRegistering}
              />
            </FormField>
            <FormField id="reg-username" label="Username:">
              <Input
                type="text"
                id="reg-username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, username: e.target.value }))}
                required
                disabled={isRegistering}
              />
            </FormField>
            <FormField id="reg-password" label="Password:">
              <Input
                type="password"
                id="reg-password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                disabled={isRegistering}
              />
            </FormField>
            <FormField
              id="reg-confirm"
              label="Confirm Password:"
              error={passwordMismatch ? 'Passwords do not match' : undefined}
            >
              <Input
                type="password"
                id="reg-confirm"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
                disabled={isRegistering}
                invalid={passwordMismatch}
              />
            </FormField>
            <Button
              type="submit"
              disabled={
                isRegistering ||
                !registerForm.email ||
                !registerForm.username ||
                !registerForm.password ||
                !registerForm.confirmPassword ||
                passwordMismatch
              }
            >
              {isRegistering ? 'Registering...' : 'Register'}
            </Button>
          </form>
        )}

        <div className="mt-[16px]">
          {showRegister ? (
            <p className="text-[12.5px] text-home-muted">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setShowRegister(false)
                  setError(null)
                }}
                className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
              >
                Login here
              </button>
            </p>
          ) : (
            <p className="text-[12.5px] text-home-muted">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setShowRegister(true)
                  setError(null)
                }}
                className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
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
