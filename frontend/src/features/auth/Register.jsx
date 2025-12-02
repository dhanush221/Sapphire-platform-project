import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import api from '../../lib/api.js'

export default function Register() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name || !email || !password || !confirm) return setError('Please complete all fields.')
    if (password !== confirm) return setError('Passwords do not match!')
    setLoading(true)
    try {
      const resp = await api.register({ name, email, password, role })
      if (!resp?.user) throw new Error('Registration failed')
      login(resp.user)
      nav('/')
    } catch (err) {
      setError(err?.message || 'Unable to register right now.')
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
            <h3>Create an Account</h3>
          </div>

          <form id="registerForm" onSubmit={onSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" id="registerName" className="form-control" placeholder="Enter your name" required value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" id="registerEmail" className="form-control" placeholder="Enter your email" required value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" id="registerPassword" className="form-control" placeholder="Enter a password" required value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" id="registerConfirm" className="form-control" placeholder="Confirm password" required value={confirm} onChange={e=>setConfirm(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select id="registerRole" className="form-control" value={role} onChange={e=>setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--full-width" disabled={loading}>{loading ? 'Creating account…' : 'Register'}</button>
          </form>

          <p className="auth-footer">Already have an account? <Link to="/login">Login here</Link></p>
        </div>
      </div>
    </div>
  )
}
