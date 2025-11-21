import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Modal from '../components/Modal.jsx'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [helpOpen, setHelpOpen] = useState(false)
  const [notify, setNotify] = useState(false)
  const [helpType, setHelpType] = useState('Task Management')
  const [helpDesc, setHelpDesc] = useState('')
  const [urgency, setUrgency] = useState('low')

  const linkClass = ({ isActive }) => `nav-btn${isActive ? ' active' : ''}`
  const showSection = (id) => {
    const map = { dashboard: '/', tasks: '/tasks', deadlines: '/deadlines', meetings: '/meetings', resources: '/resources', settings: '/settings' }
    navigate(map[id] || '/')
  }
  const closeHelpModal = () => setHelpOpen(false)
  const submitHelpRequest = async () => {
    try {
      const { api } = await import('../lib/api.js')
      await api.createHelpRequest({ type: helpType, description: helpDesc?.trim() || '(no description)', urgency })
      setHelpOpen(false); setHelpDesc(''); setUrgency('low')
      setNotify(true); setTimeout(()=> setNotify(false), 2500)
    } catch (e) { alert(e?.message || 'Failed to submit help request') }
  }

  return (
    <div className="app-container">
      <div className="navbar">
        <div className="nav-container">
          <div className="nav-brand"><span>SAPPHIRE</span></div>
          <div className="nav-links">
            <NavLink to="/" className={linkClass} end><i className="fas fa-home"/><span>Dashboard</span></NavLink>
            <NavLink to="/tasks" className={linkClass}><i className="fas fa-tasks"/><span>Tasks</span></NavLink>
            <NavLink to="/deadlines" className={linkClass}><i className="fas fa-calendar-alt"/><span>Deadlines</span></NavLink>
            <NavLink to="/meetings" className={linkClass}><i className="fas fa-comments"/><span>Meetings</span></NavLink>
            <NavLink to="/resources" className={linkClass}><i className="fas fa-book"/><span>Resources</span></NavLink>
            <NavLink to="/settings" className={linkClass}><i className="fas fa-cog"/><span>Settings</span></NavLink>
          </div>
          <button className="help-btn" id="askForHelp" onClick={()=>setHelpOpen(true)}>
            <i className="fas fa-question-circle"></i>
            <span>Ask for Help</span>
          </button>
          <Link to="/help-requests" className="help-btn" style={{marginLeft: 8, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)'}}>
            <i className="fas fa-life-ring"></i>
            <span>Requests</span>
          </Link>
          <button className="help-btn" onClick={()=>{ logout(); navigate('/login') }} style={{marginLeft: 8}}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      <main className="main-content">
        <Outlet />
      </main>

      {/* Help Modal */}
      {helpOpen && (
        <Modal titleId="helpModalTitle" onClose={closeHelpModal}>
          <div className="modal-header">
            <h3 id="helpModalTitle">Ask for Help</h3>
            <button className="modal-close" onClick={closeHelpModal} aria-label="Close"><i className="fas fa-times"/></button>
          </div>
          <div className="modal-body">
            <p>What do you need help with?</p>
            <div className="help-options">
              {[
                ['Task Management','fa-tasks'],
                ['Scheduling','fa-calendar'],
                ['Communication','fa-comments'],
                ['Technical Support','fa-cog']
              ].map(([label, icon]) => (
                <button key={label} className="help-option-btn" onClick={()=>setHelpType(label)} aria-pressed={helpType===label}>
                  <i className={`fas ${icon}`}/><span>{label}</span>
                </button>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="helpDesc">Describe your request:</label>
              <textarea id="helpDesc" className="form-control" rows={3} placeholder="Please provide details about what you need help with..." value={helpDesc} onChange={e=>setHelpDesc(e.target.value)} />
            </div>
            <div className="urgency-selector">
              <label className="form-label">Urgency Level:</label>
              <div className="urgency-options">
                <label><input type="radio" name="urgency" checked={urgency==='low'} onChange={()=>setUrgency('low')} value="low" /><span className="urgency-badge low">Low</span></label>
                <label><input type="radio" name="urgency" checked={urgency==='medium'} onChange={()=>setUrgency('medium')} value="medium" /><span className="urgency-badge medium">Medium</span></label>
                <label><input type="radio" name="urgency" checked={urgency==='high'} onChange={()=>setUrgency('high')} value="high" /><span className="urgency-badge high">High</span></label>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn--outline" onClick={closeHelpModal}>Cancel</button>
            <button className="btn btn--primary" onClick={submitHelpRequest}>Submit Request</button>
          </div>
        </Modal>
      )}

      {/* Success Notification */}
      <div className={`notification ${notify ? '' : 'hidden'}`} id="successNotification">
        <div className="notification-content success">
          <i className="fas fa-check-circle"></i>
          <span>Help request submitted successfully!</span>
        </div>
      </div>
    </div>
  )
}
