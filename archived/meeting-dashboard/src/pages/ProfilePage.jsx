import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SettingsProfilePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('student')

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('sapphireUser') || '{}')
      if (u.name) setName(u.name)
      if (u.email) setEmail(u.email)
      if (u.role) setRole(u.role)
    } catch {}
  }, [])

  const save = (e) => {
    e.preventDefault()
    try {
      const u = JSON.parse(localStorage.getItem('sapphireUser') || '{}')
      const next = { ...u, name: name?.trim() || 'User', email: email?.trim() || '', role }
      localStorage.setItem('sapphireUser', JSON.stringify(next))
      const el = document.getElementById('greeting')
      if (el) {
        const h = new Date().getHours(); let g='Hello'; if(h>=5&&h<12)g='Good Morning'; else if(h>=12&&h<17)g='Good Afternoon'; else if(h>=17&&h<21)g='Good Evening'; else g='Good Night';
        el.textContent = `${g}, ${next.name}!`
      }
      navigate('/settings')
    } catch {}
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

