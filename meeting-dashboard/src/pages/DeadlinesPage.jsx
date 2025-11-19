import { useEffect, useMemo, useState } from 'react'
import { useDeadlines } from "../lib/hooks/useDeadlines";
import { useTasks } from "../lib/hooks/useTasks";
import api from "../lib/api";


function DeadlineRow({ d, now }) {
  const due = new Date(d.dueAt)
  const diff = Math.max(0, due.getTime() - now)
  const mins = Math.floor(diff/60000)
  const hrs = Math.floor(mins/60)
  const remMins = mins % 60
  const secs = Math.floor((diff % 60000)/1000)
  return (
    <div className="deadline-row">
      <span className="deadline-title">{d.title || d.task_title || 'Deadline'}</span>
      <span className="deadline-due">{due.toLocaleString()}</span>
      <span className="deadline-countdown">{hrs}h {remMins}m {secs}s</span>
    </div>
  )
}

function AddDeadlineModal({ open, onClose, onSave, tasks }) {
  const [taskId, setTaskId] = useState('')
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [offsets, setOffsets] = useState('1440,180,60')
  const [recipientEmail, setRecipientEmail] = useState('')
  if (!open) return null
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h3>Add Deadline</h3>
        <label>Task</label>
        <select value={taskId} onChange={e=>setTaskId(e.target.value)}>
          <option value="">Select a task</option>
          {(tasks||[]).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <label>Title (optional)</label>
        <input type="text" value={title} onChange={e=>setTitle(e.target.value)} />
        <label>Due At</label>
        <input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)} />
        <label>Reminder Offsets (minutes, comma-separated)</label>
        <input type="text" value={offsets} onChange={e=>setOffsets(e.target.value)} placeholder="1440,180,60" />
        <div className="offset-presets">
          <span>Presets:</span>
          {[['1440','1 day'],['180','3 hours'],['60','1 hour']].map(([v,l])=> (
            <button type="button" key={v} data-offs={v} onClick={()=> setOffsets(o=> o ? `${o},${v}` : v)}>{l}</button>
          ))}
        </div>
        <label>Recipient Email</label>
        <input type="email" value={recipientEmail} onChange={e=>setRecipientEmail(e.target.value)} placeholder="student@example.com" />
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={()=>{
            if (!taskId || !dueAt) return
            const offs = offsets.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n))
            onSave({ taskId: Number(taskId), title: title.trim() || null, dueAt: new Date(dueAt).toISOString(), reminders: offs, recipientEmail: recipientEmail || null })
          }}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function DeadlinesPage() {
  const { deadlines, refresh, create } = useDeadlines()
  const { tasks } = useTasks()
  const [now, setNow] = useState(Date.now())
  const [title, setTitle] = useState('')
  const [taskId, setTaskId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [r1, setR1] = useState(true)
  const [r3, setR3] = useState(true)
  const [rH, setRH] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { const t = setInterval(()=> setNow(Date.now()), 1000); return ()=>clearInterval(t) }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!taskId) { setError('Please select a related task.'); return }
    if (!dueDate) { setError('Please choose a due date and time.'); return }
    const offs = []
    if (r1) offs.push(1440)
    if (r3) offs.push(180)
    if (rH) offs.push(60)
    const user = (() => { try { return JSON.parse(localStorage.getItem('sapphireUser')||'{}') } catch { return {} } })()
    let finalTaskId = taskId ? Number(taskId) : null
    if (!finalTaskId) {
      // Create a lightweight task automatically so deadlines can exist without manual linking
      const tTitle = title?.trim() || 'Deadline'
      const t = await api.createTask({ title: tTitle, dueDate: new Date(dueDate).toISOString(), priority: (priority||'medium').toLowerCase() })
      finalTaskId = t?.id
    }
    const payload = {
      taskId: finalTaskId,
      title: title || null,
      dueAt: new Date(dueDate).toISOString(),
      reminders: offs,
      recipientEmail: user?.email || null,
    }
    try {
      await create(payload)
      setTitle(''); setTaskId(''); setDueDate(''); setPriority('Medium'); setR1(true); setR3(true); setRH(false)
      await refresh()
    } catch (err) {
      setError(err?.message || 'Failed to create deadline')
    }
  }

  const monthShort = (n)=> ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][n]

  return (
    <section id="deadlines" className="content-section active">
      <div className="section-header">
        <h2>Deadline Management</h2>
        <button className="btn btn--primary" onClick={()=>{
          const form = document.getElementById('addDeadlineForm'); if (form) form.scrollIntoView({behavior:'smooth'})
        }}><i className="fas fa-plus"/> Add Deadline</button>
      </div>
      <div className="deadline-grid">
        <div className="card">
          <div className="card__header"><h3>Upcoming Deadlines</h3></div>
          <div className="card__body">
            {(!deadlines || deadlines.length===0) && <div className="deadline-empty">No upcoming deadlines</div>}
            {(deadlines||[]).map(d => {
              const due = new Date(d.dueAt)
              const day = due.getDate()
              const mon = monthShort(due.getMonth())
              const diff = Math.max(0, due.getTime() - now)
              const hoursLeft = Math.ceil(diff / 3600000)
              const daysLeft = Math.ceil(diff / 86400000)
              const msHour = 3600000, msMin = 60000
              let countdownText = 'Due now'
              if (diff > 0 && hoursLeft < 24) {
                const hrs = Math.floor(diff / msHour)
                const mins = Math.floor((diff % msHour) / msMin)
                countdownText = `${hrs}h ${mins}m remaining`
              } else if (diff >= 24 * msHour) {
                countdownText = `${daysLeft} days remaining`
              }
              const urgent = hoursLeft <= 24
              return (
                <div key={d.id || `${d.taskId}-${d.dueAt}`} className={`deadline-item ${urgent?'urgent':'normal'}`}>
                  <div className="deadline-date"><span className="day">{day}</span><span className="month">{mon}</span></div>
                  <div className="deadline-info">
                    <h4>{d.title || d.task_title || 'Deadline'}</h4>
                    <div className="countdown">{countdownText}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card" id="addDeadlineForm">
          <div className="card__header"><h3>Add New Deadline</h3></div>
          <div className="card__body">
            <form className="deadline-form" onSubmit={onSubmit}>
              {error && <div className="deadline-empty" style={{color:'var(--color-error)'}}>{error}</div>}
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input type="text" className="form-control" placeholder="Enter task title (optional)" value={title} onChange={e=>setTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-control" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-control" value={priority} onChange={e=>setPriority(e.target.value)}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Related Task</label>
                <select className="form-control" value={taskId} onChange={e=>setTaskId(e.target.value)}>
                  <option value="">Select a task</option>
                  {(tasks||[]).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reminder Settings</label>
                <div className="reminder-options">
                  <label><input type="checkbox" checked={r1} onChange={e=>setR1(e.target.checked)} /> 1 day before</label>
                  <label><input type="checkbox" checked={r3} onChange={e=>setR3(e.target.checked)} /> 3 hours before</label>
                  <label><input type="checkbox" checked={rH} onChange={e=>setRH(e.target.checked)} /> 1 hour before</label>
                </div>
              </div>
              <button type="submit" className="btn btn--primary btn--full-width">Add Deadline</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
