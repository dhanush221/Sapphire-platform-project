import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function SettingsPage() {
  const { user } = useAuth()
  const [theme, setTheme] = useState('auto')
  const [highContrast, setHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState('medium')
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [role, setRole] = useState(user?.role || 'student')
  const navigate = useNavigate()

  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-color-scheme', 'dark')
    else if (theme === 'light') document.documentElement.setAttribute('data-color-scheme', 'light')
    else document.documentElement.removeAttribute('data-color-scheme')
  }, [theme])

  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast)
  }, [highContrast])

  useEffect(() => {
    const map = { small: '12px', medium: '14px', large: '16px' }
    const val = map[fontSize] || '14px'
    document.documentElement.style.setProperty('--font-size-base', val)
  }, [fontSize])

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setRole(user.role || 'student')
    }
  }, [user])

  const savePersonal = (e) => { e?.preventDefault?.(); navigate('/settings/profile') }

  return (
    <section id="settings" className="content-section active">
      <div className="section-header"><h2>Settings & Customization</h2></div>
      <div className="settings-grid">
        <div className="card">
          <div className="card__header"><h3>Personal Details</h3></div>
          <div className="card__body">
            <p>Update your name, email, and role information.</p>
            <button className="btn btn--primary" onClick={()=>navigate('/settings/profile')}>Edit Personal Details</button>
          </div>
        </div>
        <div className="card">
          <div className="card__header"><h3>Appearance</h3></div>
          <div className="card__body">
            <div className="form-group">
              <label className="form-label">Theme</label>
              <select className="form-control" id="themeSelect" value={theme} onChange={e=>setTheme(e.target.value)}>
                <option value="auto">Auto (Follow system)</option>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Font Size</label>
              <div className="font-size-controls">
                <button className={`btn btn--sm ${fontSize==='small'?'btn--primary':'btn--outline'}`} onClick={()=>setFontSize('small')}>Small</button>
                <button className={`btn btn--sm ${fontSize==='medium'?'btn--primary':'btn--outline'}`} onClick={()=>setFontSize('medium')}>Medium</button>
                <button className={`btn btn--sm ${fontSize==='large'?'btn--primary':'btn--outline'}`} onClick={()=>setFontSize('large')}>Large</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">High Contrast</label>
              <label className="toggle">
                <input type="checkbox" id="highContrast" checked={highContrast} onChange={e=>setHighContrast(e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__header"><h3>Notifications</h3></div>
          <div className="card__body">
            <div className="form-group"><label className="form-label">Task Reminders</label><label className="toggle"><input type="checkbox" id="taskReminders" defaultChecked /><span className="toggle-slider"></span></label></div>
            <div className="form-group"><label className="form-label">Meeting Notifications</label><label className="toggle"><input type="checkbox" id="meetingNotifications" defaultChecked /><span className="toggle-slider"></span></label></div>
            <div className="form-group"><label className="form-label">Break Reminders</label><label className="toggle"><input type="checkbox" id="breakReminders" /><span className="toggle-slider"></span></label></div>
          </div>
        </div>
        <div className="card">
          <div className="card__header"><h3>Accessibility</h3></div>
          <div className="card__body">
            <div className="form-group"><label className="form-label">Reduce Motion</label><label className="toggle"><input type="checkbox" id="reduceMotion" /><span className="toggle-slider"></span></label></div>
            <div className="form-group"><label className="form-label">Screen Reader Support</label><label className="toggle"><input type="checkbox" id="screenReader" defaultChecked /><span className="toggle-slider"></span></label></div>
            <div className="form-group"><label className="form-label">Keyboard Navigation</label><label className="toggle"><input type="checkbox" id="keyboardNav" defaultChecked /><span className="toggle-slider"></span></label></div>
          </div>
        </div>
        <div className="card design-principles-card">
          <div className="card__header"><h3>Autism-Friendly Design Principles</h3></div>
          <div className="card__body">
            <div className="design-principles-wrapper">
              <img src="https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/7e33f05c8d808293b50d3f649bf25bc8/c4f28220-f3fa-4ffd-8730-5fbc6204ec13/1d2a0370.png" alt="Autism-Friendly Design Principles" className="design-principles-diagram" onError={(e)=>{e.currentTarget.style.display='none'; const next=e.currentTarget.nextElementSibling; if(next) next.style.display='block'}} />
              <div className="image-fallback" style={{display:'none'}}>
                <div className="principles-text">
                  <h4>Design Principles for Neurodivergent Users:</h4>
                  <ul>
                    <li><strong>Visual Design:</strong> Clear contrast, consistent layouts, minimal distractions</li>
                    <li><strong>Cognitive Accessibility:</strong> Simple language, clear instructions, predictable navigation</li>
                    <li><strong>Sensory Considerations:</strong> Calm colors, reduced motion, customizable interfaces</li>
                    <li><strong>Executive Function Support:</strong> Task organization, reminders, progress tracking</li>
                    <li><strong>Communication Support:</strong> Multiple ways to access information, visual aids</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal removed; using dedicated route /settings/profile */}
    </section>
  )
}
 
