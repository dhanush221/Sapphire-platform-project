import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') || '', [params])
  const nav = useNavigate()
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!token) return setError('Reset token missing. Please use the link from your email.')
    if (!password || password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    try {
      const resp = await api.resetPassword({ token, password })
      if (resp?.user) {
        login(resp.user)
        setMessage('Password updated. Redirecting...')
        setTimeout(() => nav('/'), 600)
      } else {
        setMessage('Password updated. You can now log in.')
      }
    } catch (err) {
      setError(err?.message || 'Unable to reset password.')
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
            <h3>Reset Password</h3>
          </div>

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" className="form-control" placeholder="Enter a new password" required value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" className="form-control" placeholder="Confirm password" required value={confirm} onChange={e=>setConfirm(e.target.value)} />
            </div>
            {error && <p className="error">{error}</p>}
            {message && <p className="success">{message}</p>}
            <button type="submit" className="btn btn--primary btn--full-width" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>

          <p className="auth-footer">
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
