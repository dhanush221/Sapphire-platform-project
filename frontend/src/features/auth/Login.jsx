import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import api from '../../lib/api.js'

export default function Login() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Register here</Link><br/>
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
