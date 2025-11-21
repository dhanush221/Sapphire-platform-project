import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function SettingsProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [role, setRole] = useState(user?.role || 'student')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setRole(user.role || 'student')
    }
  }, [user])

  const save = (e) => {
    e.preventDefault()
    updateUser({ name: name?.trim() || 'User', email: email?.trim() || '', role })
    navigate('/settings')
  }

  return (
    <section id="settings" className="content-section active">
      <div className="section-header">
        <h2>Edit Personal Details</h2>
      </div>
      <div className="settings-grid">
        <div className="card">
          <div className="card__header"><h3>Personal Details</h3></div>
          <div className="card__body">
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={role} onChange={e=>setRole(e.target.value)}>
                  <option value="student">Student</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
              <div className="modal-footer" style={{padding:0, marginTop:12}}>
                <button type="button" className="btn btn--outline" onClick={()=>navigate('/settings')}>Cancel</button>
                <button type="submit" className="btn btn--primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
