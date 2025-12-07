import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('student')

  function onSubmit(e) {
    e.preventDefault()
    if (!name || !email || !password || !confirm) return alert('Please complete all fields.')
    if (password !== confirm) return alert('Passwords do not match!')
    localStorage.setItem('sapphireUser', JSON.stringify({ name, email, role }))
    alert('Registration successful! Please log in.')
    nav('/login')
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
            <button type="submit" className="btn btn--primary btn--full-width">Register</button>
          </form>

          <p className="auth-footer">Already have an account? <Link to="/login">Login here</Link></p>
        </div>
      </div>
    </div>
  )
}
