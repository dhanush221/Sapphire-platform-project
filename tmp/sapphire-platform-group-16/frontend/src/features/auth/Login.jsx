import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Login() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')

  function onSubmit(e) {
    e.preventDefault()
    if (!email || !password) return alert('Please fill in all fields.')
    const prev = (() => { try { return JSON.parse(localStorage.getItem('sapphireUser') || '{}') } catch { return {} } })()
    const name = prev && prev.email === email && prev.name ? prev.name : undefined
    const user = { email, role, ...(name ? { name } : {}) }
    login(user)
    nav('/')
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
            <div className="form-group">
              <label>Role</label>
              <select id="loginRole" className="form-control" value={role} onChange={e=>setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
            <button type="submit" className="btn btn--primary btn--full-width">Login</button>
          </form>

          <p className="auth-footer">Don't have an account? <Link to="/register">Register here</Link></p>
        </div>
      </div>
    </div>
  )
}
