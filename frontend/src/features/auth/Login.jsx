import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import api from '../../lib/api.js'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Login() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(() => typeof window !== 'undefined' && !!window.google)
  const googleButtonRef = useRef(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) return setError('Please fill in all fields.')
    setLoading(true)
    try {
      const resp = await api.login({ email, password })
      if (!resp?.user) throw new Error('Missing user payload')
      login(resp.user)
      nav('/')
    } catch (err) {
      setError(err?.message || 'Unable to login.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleCredential(credential) {
    if (!credential) {
      setError('Google sign-in failed. Please try again.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const resp = await api.loginWithGoogle(credential)
      if (!resp?.user) throw new Error('Missing user payload')
      login(resp.user)
      nav('/')
    } catch (err) {
      setError(err?.message || 'Unable to sign in with Google.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!googleClientId || typeof document === 'undefined') return
    const existing = document.querySelector('script[data-google-identity]')
    if (existing) {
      if (window.google) setGoogleReady(true)
      else existing.addEventListener('load', () => setGoogleReady(true), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => setGoogleReady(true)
    document.head.appendChild(script)
    return () => {
      script.onload = null
    }
  }, [])

  useEffect(() => {
    if (!googleReady || !googleClientId || !googleButtonRef.current || typeof window === 'undefined' || !window.google) return
    googleButtonRef.current.innerHTML = ''
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: ({ credential }) => handleGoogleCredential(credential),
      ux_mode: 'popup'
    })
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 320
    })
  }, [googleReady])

  return (
    <div className="auth-body">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <i className="fas fa-gem"></i>
            <h2>Sapphire Platform</h2>
            <h3>Welcome Back</h3>
          </div>

          <form id="loginForm" onSubmit={onSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" id="loginEmail" className="form-control" placeholder="Enter your email" required value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" id="loginPassword" className="form-control" placeholder="Enter your password" required value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <div className="form-group remember-me">
              <label><input type="checkbox" id="rememberMe"/> Remember me</label>
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--full-width" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
          </form>

          {googleClientId && (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <div className={`google-btn-wrapper ${loading ? 'is-loading' : ''}`}>
                <div ref={googleButtonRef} className="google-btn-slot" aria-live="polite"></div>
              </div>
            </>
          )}

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Register here</Link><br/>
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
