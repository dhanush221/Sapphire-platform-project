import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!email) return setError('Enter your account email.')
    setLoading(true)
    try {
      await api.requestPasswordReset(email)
      setMessage('If that email exists, a reset link has been sent.')
    } catch (err) {
      setError(err?.message || 'Unable to start password reset.')
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
            <h3>Forgot Password</h3>
          </div>

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="form-control" placeholder="Enter your email" required value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            {error && <p className="error">{error}</p>}
            {message && <p className="success">{message}</p>}
            <button type="submit" className="btn btn--primary btn--full-width" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="auth-footer">
            Remembered? <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
