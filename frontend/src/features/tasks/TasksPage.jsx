import { useCallback, useEffect, useMemo, useState, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Modal from '../../components/Modal.jsx'
import { useTasks } from '../../lib/hooks/useTasks'
import { useDeadlines } from '../../lib/hooks/useDeadlines'
import { useFolders } from '../../lib/hooks/useFolders'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext.jsx'
import { usePreferences } from '../../context/PreferencesContext.jsx'

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

function hexToRgba(hex, alpha = 0.3) {
  if (!hex || typeof hex !== 'string') return null;
  const normalized = hex.trim().replace(/^#/, '');
  if (![3, 6].includes(normalized.length)) return null;
  const value = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized;
  const intVal = Number.parseInt(value, 16);
  if (Number.isNaN(intVal)) return null;
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isSameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

const TaskCard = memo(function TaskCard({ task, onEdit, onDelete, onSubtasksChanged }) {
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null
  const due = dueDateObj ? dueDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
  const [open, setOpen] = useState(false)
  const [subs, setSubs] = useState([])
  const [newSub, setNewSub] = useState('')
  const { preferences } = usePreferences()
  const reduceMotion = !!preferences?.accessibility?.reduceMotion || (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false)

  useEffect(() => {
    let alive = true
    if (open) {
      api.listSubtasks(task.id).then(items => { if (alive) setSubs(items||[]) }).catch(()=>{})
    }
    return () => { alive = false }
  }, [open, task.id])

  const toggleDone = async (sub) => {
    try { await api.updateSubtask(sub.id, { done: !sub.done }); const items = await api.listSubtasks(task.id); setSubs(items); onSubtasksChanged?.(task.id, items) } catch {}
  }
  const addSub = async () => {
    const title = newSub.trim(); if (!title) return; setNewSub('')
    try { await api.createSubtask(task.id, { title }); const items = await api.listSubtasks(task.id); setSubs(items); onSubtasksChanged?.(task.id, items) } catch {}
  }
  const deleteSub = async (sub) => {
    try { await api.deleteSubtask(sub.id); const items = await api.listSubtasks(task.id); setSubs(items); onSubtasksChanged?.(task.id, items) } catch {}
  }

  const doneCount = subs.filter(s=>s.done).length
  const pct = subs.length ? Math.round((doneCount/subs.length)*100) : (task.status==='completed'?100: task.status==='in_progress'?50:0)

  const cat = (task.category || '').trim()
  const catSlug = cat ? cat.toLowerCase().replace(/\s+/g,'-') : ''
  const pri = (task.priority || 'medium')
  const leftAccent = pri === 'high' ? 'var(--color-error)' : pri === 'low' ? 'var(--color-success)' : 'var(--color-warning)'

  // Compute urgency for hover tooltip
  const urgency = (() => {
    if ((task.status||'') === 'completed') return { level: 'done', label: 'Completed', note: '' }
    if (!dueDateObj) {
      const map = { high: 'High', medium: 'Medium', low: 'Low' }
      return { level: pri==='high'?'high':pri==='low'?'low':'medium', label: `${map[pri]} Priority`, note: 'No due date' }
    }
    const now = new Date();
    const ms = dueDateObj.setHours(0,0,0,0) - now.setHours(0,0,0,0)
    const days = Math.floor(ms / (1000*60*60*24))
    if (days < 0) return { level: 'overdue', label: 'Overdue', note: `${Math.abs(days)} day${Math.abs(days)===1?'':'s'} ago` }
    if (days === 0) return { level: 'urgent', label: 'Due Today', note: 'Finish soon' }
    if (days <= 1) return { level: 'urgent', label: 'Urgent', note: 'Due tomorrow' }
    if (days <= 3) return { level: 'high', label: 'High', note: `Due in ${days} days` }
    if (days <= 7) return { level: 'medium', label: 'Medium', note: `Due in ${days} days` }
    return { level: 'low', label: 'Low', note: `Due in ${days} days` }
  })()
  return (
    <div className={`task-card`} style={{borderLeftColor: leftAccent}} data-task-id={task.id} draggable onDragStart={(e)=>{
      e.dataTransfer.setData('text/plain', String(task.id))
    }}>
      <div className={`urgency-tooltip`} role="tooltip">
        <span className={`urgency-pill ${urgency.level}`}>{urgency.label}</span>
        {urgency.note && <span className="urgency-note">{urgency.note}</span>}
      </div>
      <h4>{task.title}</h4>
      <div className="task-meta">{due ? `Due: ${due}` : ''}</div>
      <div style={{display:"flex", gap:8, marginTop:8}}>
        <button className="btn btn--outline btn--sm" title="Edit" onClick={()=>onEdit(task)}><i className="fas fa-pen"/></button>
        <button className="btn btn--outline btn--sm" style={{color: "var(--color-error)"}} title="Delete" onClick={()=>onDelete(task)}><i className="fas fa-trash"/></button>
      </div>
      <div className="task-progress" title={`${pct}% Complete`} style={{marginTop:8}}>
        <div className="progress-bar"><div className="progress-fill" style={{width: `${pct}%`}}></div></div>
      </div>
      {cat && (
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:8}}>
          <span className={`category ${catSlug}`}>{cat}</span>
        </div>
      )}
      <button
        className="btn btn--outline btn--sm"
        style={{marginTop:8}}
        onClick={()=>setOpen(v=>!v)}
        aria-expanded={open}
        aria-controls={`st-${task.id}`}
      >
        {open?'Hide Checklist':'Show Checklist'}
      </button>
      <div id={`st-${task.id}`} className={`task-subtasks ${open ? 'is-open' : 'is-closed'}`} style={{marginTop:8}} aria-hidden={!open}>
          {(subs||[]).map(s => (
            <div key={s.id} className="subtask-row">
              <label><input type="checkbox" checked={!!s.done} onChange={()=>toggleDone(s)} /> <span style={{textDecoration: reduceMotion ? 'none' : (s.done?'line-through':'none'), color: reduceMotion && s.done ? 'var(--color-text-secondary)' : undefined}}>{s.title}</span></label>
              <button className="btn-st-delete" onClick={()=>deleteSub(s)}><i className="fas fa-trash"/></button>
            </div>
          ))}
          <div className="subtask-add">
            <input
              type="text"
              placeholder="Add a checklist item..."
              value={newSub}
              onChange={e=>setNewSub(e.target.value)}
              onKeyDown={e=>{ if (e.key === 'Enter') { e.preventDefault(); addSub() } }}
            />
            <button className="btn btn--primary btn--sm" onClick={addSub}>Add</button>
          </div>
      </div>
    </div>
  )
})

const AddEditTaskModal = memo(function AddEditTaskModal({ open, task, onClose, onSave, folders, defaultFolderId, assigneeEmail }) {
  const [title, setTitle] = useState(task?.title || '')
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.substring(0,10) : '')
  const [priority, setPriority] = useState(task?.priority || 'medium')
  const [category, setCategory] = useState(task?.category || '')
  const [folderId, setFolderId] = useState(task?.folderId ?? defaultFolderId ?? null)

  // Keep fields in sync if task changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(task?.title || '')
      setDueDate(task?.dueDate ? task.dueDate.substring(0,10) : '')
      setPriority(task?.priority || 'medium')
      setCategory(task?.category || '')
      setFolderId(task?.folderId ?? defaultFolderId ?? null)
    }
  }, [open, task, defaultFolderId])

  if (!open) return null
  return (
    <Modal titleId="taskModalTitle" onClose={onClose}>
      <h3 id="taskModalTitle">{task ? 'Edit Task' : 'Add Task'}</h3>
      <label htmlFor="taskTitle">Title</label>
      <input id="taskTitle" type="text" value={title} onChange={e=>setTitle(e.target.value)} />
      <label htmlFor="taskDue">Due Date</label>
      <input id="taskDue" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
      <label htmlFor="taskPriority">Priority</label>
        <select id="taskPriority" value={priority} onChange={e=>setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      <label htmlFor="taskCategory">Category</label>
      <input id="taskCategory" type="text" placeholder="e.g., Meetings, Learning, Project Work" value={category} onChange={e=>setCategory(e.target.value)} />
      <label htmlFor="taskFolder">Folder</label>
      <select id="taskFolder" value={folderId ?? ''} onChange={e=>{
        const val = e.target.value === '' ? null : Number(e.target.value)
        setFolderId(val)
      }}>
        <option value="">No folder</option>
        {(folders||[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      {assigneeEmail && <p style={{marginTop:8, color:'var(--color-muted)', fontSize:14}}>This task will be assigned to <strong>{assigneeEmail}</strong>.</p>}
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
        <button className="btn btn--primary" onClick={()=> onSave({ title: title.trim(), dueDate: dueDate ? new Date(dueDate).toISOString() : null, priority, category: category?.trim() || null, folderId })}>Save</button>
      </div>
    </Modal>
  )
})

export default function TasksPage() {
  const { user } = useAuth()
  const isSupervisor = (user?.role === 'supervisor')
  const { tasks, refresh, create, update, remove, reorder } = useTasks()
  const { deadlines } = useDeadlines()
  const { folders, create: createFolder, remove: removeFolder, update: updateFolder, refresh: refreshFolders } = useFolders()
  const [searchParams, setSearchParams] = useSearchParams()
  const allowedViews = useMemo(() => ['kanban','list','calendar','timeline'], [])
  const initialView = useMemo(() => {
    const urlView = searchParams.get('view')
    const stored = (()=>{ try { return localStorage.getItem('sapphireTasksView') } catch { return null } })()
    const v = urlView || stored || 'kanban'
    return allowedViews.includes(v) ? v : 'kanban'
  }, [searchParams, allowedViews])
  const [view, setView] = useState(initialView)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [subProgress, setSubProgress] = useState({})
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentError, setStudentError] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState('#4f46e5')
  const [useFolderColor, setUseFolderColor] = useState(false)
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [googleStatus, setGoogleStatus] = useState({ connected: false, email: null })
  const [googleEvents, setGoogleEvents] = useState([])
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState(null)
  const [googleConnecting, setGoogleConnecting] = useState(false)

  // Sync view with URL query (?view=kanban|list|calendar)
  useEffect(() => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      p.set('view', view)
      return p
    }, { replace: true })
    try { localStorage.setItem('sapphireTasksView', view) } catch {}
  }, [view, setSearchParams])

  useEffect(() => {
    const v = searchParams.get('view')
    if (v && allowedViews.includes(v) && v !== view) setView(v)
  }, [searchParams])

  // When supervisor, load student roster to assign tasks
  useEffect(() => {
    let alive = true
    if (!isSupervisor) {
      setStudents([]); setSelectedStudent(null); setStudentError(null); setLoadingStudents(false)
      return () => {}
    }
    setLoadingStudents(true); setStudentError(null)
    api.listUsers({ role: 'student' })
      .then(data => {
        if (!alive) return
        setStudents(data || [])
        if (data && data.length > 0) {
          setSelectedStudent(data[0])
        }
      })
      .catch(err => { if (alive) setStudentError(err) })
      .finally(() => { if (alive) setLoadingStudents(false) })
    return () => { alive = false }
  }, [isSupervisor])

  // Keep tasks/folders in sync with selected student
  useEffect(() => {
    const targetEmail = isSupervisor ? (selectedStudent?.email || null) : null
    if (isSupervisor && !targetEmail) return
    refresh({ forEmail: targetEmail })
    refreshFolders({ forEmail: targetEmail })
    setSelectedFolder('all')
  }, [isSupervisor, selectedStudent, refresh, refreshFolders])

  const activeAssigneeEmail = isSupervisor ? (selectedStudent?.email || null) : null
  const canManageTasks = !isSupervisor || !!activeAssigneeEmail

  const folderById = useMemo(() => {
    const map = {}
    ;(folders || []).forEach(f => { if (f?.id != null) map[f.id] = f })
    return map
  }, [folders])

  const folderChipStyle = useCallback((folder, isActive) => {
    if (!folder?.color) return {}
    const subtle = hexToRgba(folder.color, 0.18) || folder.color
    const outline = hexToRgba(folder.color, 0.45) || folder.color
    return {
      background: isActive ? folder.color : subtle,
      borderColor: outline,
      color: isActive ? 'var(--color-white)' : 'var(--color-text)'
    }
  }, [])

  const filteredTasks = useMemo(() => {
    if (isSupervisor && !activeAssigneeEmail) return []
    if (selectedFolder === 'all') return tasks || []
    if (selectedFolder === 'none') return (tasks||[]).filter(t => !t.folderId)
    return (tasks||[]).filter(t => t.folderId === selectedFolder)
  }, [tasks, selectedFolder, isSupervisor, activeAssigneeEmail])

  const lists = useMemo(() => {
    const by = { pending: [], in_progress: [], completed: [] }
    ;(filteredTasks||[]).forEach(t => { (by[t.status || 'pending'] || (by[t.status||'pending']=[])).push(t) })
    Object.values(by).forEach(arr => arr.sort((a,b)=> (a.orderIndex??0)-(b.orderIndex??0)))
    return by
  }, [filteredTasks])

  const onDropTo = useCallback(async (status, e) => {
    e.preventDefault()
    const taskId = Number(e.dataTransfer.getData('text/plain'))
    const col = lists[status] || []
    // Build updates: compute orderIndex for this column after moving the task to end
    const existingIds = col.map(t=>t.id)
    const ids = existingIds.includes(taskId) ? existingIds : [...existingIds, taskId]
    const updates = ids.map((id, index) => ({ id, status, orderIndex: index }))
    await reorder(updates, { forEmail: activeAssigneeEmail })
  }, [lists, reorder, activeAssigneeEmail])

  const [calMonth, setCalMonth] = useState(()=> new Date().getMonth())
  const [calYear, setCalYear] = useState(()=> new Date().getFullYear())
  const monthName = useMemo(()=> ['January','February','March','April','May','June','July','August','September','October','November','December'][calMonth], [calMonth])
  const [plannerDate, setPlannerDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [plannerNewTitle, setPlannerNewTitle] = useState('')
  const [plannerNewTime, setPlannerNewTime] = useState('09:00')
  const [plannerAllDay, setPlannerAllDay] = useState(false)
  const [plannerNewPriority, setPlannerNewPriority] = useState('medium')
  const [plannerNewFolder, setPlannerNewFolder] = useState('auto')

  const days = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const cells = []
    const isEventOnDay = (ev, dayDate) => {
      if (!ev) return false
      if (ev.isAllDay && ev.startDate && ev.endDate) {
        return dayDate >= ev.startDate && dayDate < ev.endDate
      }
      if (ev.startDate) return ev.startDate === dayDate
      if (ev.start) return ev.start.startsWith(dayDate)
      return false
    }
    for (let i=0;i<firstDay;i++) cells.push({ empty:true, key:`e-${i}` })
    for (let d=1; d<=daysInMonth; d++) {
      const dayDate = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const t = (filteredTasks||[]).filter(x => x.dueDate && x.dueDate.startsWith && x.dueDate.startsWith(dayDate))
      const dl = (deadlines||[]).filter(x => x.dueAt && x.dueAt.startsWith && x.dueAt.startsWith(dayDate))
      const ge = (googleEvents||[]).filter(ev => isEventOnDay(ev, dayDate))
      cells.push({ empty:false, day:d, key:`d-${d}`, tasks:t, deadlines:dl, events:ge })
    }
    return cells
  }, [filteredTasks, deadlines, googleEvents, calMonth, calYear])

  const plannerTasks = useMemo(() => {
    const dayStart = new Date(plannerDate); dayStart.setHours(0,0,0,0)
    return (filteredTasks||[])
      .filter(t => t.dueDate)
      .map(t => {
        const due = new Date(t.dueDate)
        return { ...t, _due: due, _hasTime: due.getHours() !== 0 || due.getMinutes() !== 0 }
      })
      .filter(t => isSameDay(t._due, dayStart))
      .sort((a,b) => a._due - b._due || (a.title||'').localeCompare(b.title||''))
  }, [filteredTasks, plannerDate])

  const plannerEvents = useMemo(() => {
    const day = new Date(plannerDate); day.setHours(0,0,0,0)
    const dayStr = day.toISOString().slice(0,10)
    const eventsForDay = (googleEvents||[])
      .filter(ev => {
        if (ev.isAllDay && ev.startDate && ev.endDate) {
          return dayStr >= ev.startDate && dayStr < ev.endDate
        }
        if (ev.startDate) return ev.startDate === dayStr
        if (ev.start) return ev.start.startsWith(dayStr)
        return false
      })
      .map(ev => {
        const start = ev.start ? new Date(ev.start) : null
        const timeLabel = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
        return { ...ev, _start: start, _timeLabel: timeLabel }
      })
    const allDay = eventsForDay.filter(ev => ev.isAllDay || !ev._start)
    const timed = eventsForDay.filter(ev => ev._start).sort((a,b)=> a._start - b._start)
    return { allDay, timed }
  }, [googleEvents, plannerDate])

  const defaultFolderId = useMemo(() => {
    if (selectedFolder === 'all' || selectedFolder === 'none') return null
    return selectedFolder
  }, [selectedFolder])

  const shiftPlannerDay = useCallback((delta) => {
    setPlannerDate(prev => {
      const next = new Date(prev)
      next.setDate(prev.getDate() + delta)
      next.setHours(0,0,0,0)
      return next
    })
  }, [])

  const resetPlannerToToday = useCallback(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    setPlannerDate(today)
  }, [])

  useEffect(() => {
    // Keep quick-add folder aligned with current filter unless user picked specific folder
    setPlannerNewFolder('auto')
  }, [selectedFolder])

  const handleSlotClick = useCallback((hour) => {
    setPlannerAllDay(false)
    const hr = String(hour).padStart(2,'0')
    setPlannerNewTime(`${hr}:00`)
  }, [])

  const onAddPlannerTask = useCallback(async () => {
    const title = plannerNewTitle.trim()
    if (!title) { alert('Please enter a task title'); return }
    const due = new Date(plannerDate)
    if (!plannerAllDay && plannerNewTime) {
      const [h,m] = plannerNewTime.split(':').map(Number)
      due.setHours(Number.isFinite(h)?h:0, Number.isFinite(m)?m:0, 0, 0)
    } else {
      due.setHours(0,0,0,0)
    }
    const folderId = (() => {
      if (plannerNewFolder === 'auto') return defaultFolderId ?? null
      if (plannerNewFolder === 'none') return null
      const val = Number(plannerNewFolder)
      return Number.isNaN(val) ? null : val
    })()
    const payload = {
      title,
      dueDate: due.toISOString(),
      priority: plannerNewPriority || 'medium',
      folderId
    }
    try {
      const finalPayload = isSupervisor ? { ...payload, assigneeEmail: activeAssigneeEmail } : payload
      await create(finalPayload, { forEmail: activeAssigneeEmail })
      setPlannerNewTitle('')
    } catch (err) {
      alert(err?.message || 'Could not create task')
    }
  }, [plannerNewTitle, plannerNewTime, plannerAllDay, plannerNewPriority, plannerNewFolder, plannerDate, defaultFolderId, isSupervisor, activeAssigneeEmail, create])

  const onSaveTask = async (payload) => {
    if (!payload.title) { alert('Title is required'); return }
    try {
      const finalPayload = isSupervisor ? { ...payload, assigneeEmail: activeAssigneeEmail } : payload
      if (editing) await update(editing.id, finalPayload, { forEmail: activeAssigneeEmail })
      else await create(finalPayload, { forEmail: activeAssigneeEmail })
      setModalOpen(false); setEditing(null)
    } catch (e) {
      alert(e?.message || 'Failed to save task. If you are running the frontend dev server, set VITE_API_BASE to your backend URL.')
    }
  }

  const openAdd = () => { if (!canManageTasks) return; setEditing(null); setModalOpen(true) }
  const openEdit = (t) => { setEditing(t); setModalOpen(true) }
  const onDelete = async (t) => { if (confirm('Delete this task?')) { await remove(t.id, { forEmail: activeAssigneeEmail }) } }
  const addFolder = async () => {
    if (!newFolderName.trim()) { alert('Folder name is required'); return }
    if (useFolderColor && newFolderColor && !HEX_COLOR_REGEX.test(newFolderColor)) {
      alert('Folder color should be a hex code like #4F46E5');
      return;
    }
    const payload = { name: newFolderName.trim(), forEmail: activeAssigneeEmail }
    if (useFolderColor && newFolderColor) payload.color = newFolderColor
    try {
      await createFolder(payload, { forEmail: activeAssigneeEmail })
      setNewFolderName('')
      setUseFolderColor(false)
      setShowFolderForm(false)
    } catch (e) { alert(e?.message || 'Failed to create folder') }
  }
  const deleteFolder = async (id) => {
    if (!confirm('Delete this folder? Tasks inside will be left unfiled.')) return
    try { await removeFolder(id, { forEmail: activeAssigneeEmail }); setSelectedFolder('all') } catch (e) { alert(e?.message || 'Failed to delete folder') }
  }
  const renameFolder = async (folder) => {
    const name = prompt('New folder name', folder.name)
    if (!name) return
    const colorInput = prompt('Update color (hex like #4F46E5). Leave blank to remove color.', folder.color || '')
    const payload = { name: name.trim() }
    if (colorInput !== null) {
      const trimmed = colorInput.trim()
      if (trimmed && !HEX_COLOR_REGEX.test(trimmed)) {
        alert('Color must be a hex value like #3366FF');
        return;
      }
      if (trimmed || folder.color) payload.color = trimmed || null
    }
    try { await updateFolder(folder.id, payload, { forEmail: activeAssigneeEmail }) } catch (e) { alert(e?.message || 'Failed to rename folder') }
  }
  const onSelectStudent = (email) => {
    if (!email) { setSelectedStudent(null); return }
    const match = (students||[]).find(s => s.email === email)
    setSelectedStudent(match || { email })
  }

  const startGoogleConnect = async () => {
    setGoogleError(null)
    setGoogleConnecting(true)
    try {
      const res = await api.googleCalendarAuthUrl()
      const url = res?.url
      if (!url) throw new Error('Missing auth URL')
      const w = window.open(url, 'google-calendar-connect', 'width=520,height=640')
      if (!w) alert('Please allow popups to connect Google Calendar.')
    } catch (err) {
      alert(err?.message || 'Could not start Google connection.')
      setGoogleError(err instanceof Error ? err : new Error('Could not start Google connection'))
    } finally {
      setGoogleConnecting(false)
    }
  }

  const loadGoogleStatus = useCallback(async () => {
    if (!user) {
      setGoogleStatus({ connected: false, email: null })
      setGoogleEvents([])
      return
    }
    try {
      const status = await api.googleCalendarStatus()
      setGoogleStatus(status || { connected: false, email: null })
      setGoogleError(null)
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unable to load Google Calendar status')
      setGoogleError(e)
      setGoogleStatus(prev => prev)
    }
  }, [user])

  const fetchGoogleEvents = useCallback(async (opts = {}) => {
    if (!googleStatus.connected) return
    const start = opts.timeMin || new Date(calYear, calMonth, 1).toISOString()
    const end = opts.timeMax || new Date(calYear, calMonth + 1, 0, 23, 59, 59, 999).toISOString()
    setGoogleLoading(true); setGoogleError(null)
    try {
      const data = await api.googleCalendarEvents({ timeMin: start, timeMax: end })
      setGoogleEvents(data?.events || [])
      if (data?.connectedEmail) {
        setGoogleStatus(s => ({ ...s, connected: true, email: data.connectedEmail }))
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Could not load Google Calendar events')
      setGoogleError(e)
      setGoogleEvents([])
    } finally {
      setGoogleLoading(false)
    }
  }, [googleStatus.connected, calMonth, calYear])

  useEffect(() => {
    loadGoogleStatus()
  }, [loadGoogleStatus])

  useEffect(() => {
    if (view !== 'calendar' || !googleStatus.connected) return undefined
    fetchGoogleEvents()
  }, [view, googleStatus.connected, fetchGoogleEvents])

  useEffect(() => {
    if (view !== 'timeline' || !googleStatus.connected) return undefined
    const start = new Date(plannerDate.getFullYear(), plannerDate.getMonth(), 1).toISOString()
    const end = new Date(plannerDate.getFullYear(), plannerDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
    fetchGoogleEvents({ timeMin: start, timeMax: end })
  }, [view, googleStatus.connected, plannerDate, fetchGoogleEvents])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handler = (event) => {
      const data = event?.data
      if (!data || data.source !== 'sapphire' || data.type !== 'google-calendar') return
      loadGoogleStatus()
      if (data.ok) fetchGoogleEvents()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [fetchGoogleEvents, loadGoogleStatus])

  return (
    <section id="tasks" className="content-section active">
      {isSupervisor && (
        <div className="card" style={{marginBottom: 16}}>
          <div className="card__body" style={{display:'flex', gap:16, alignItems:'center', flexWrap:'wrap'}}>
            <div style={{minWidth: 260}}>
              <label className="form-label" htmlFor="studentSelect">Assign tasks to</label>
              <select id="studentSelect" className="form-control" value={selectedStudent?.email || ''} onChange={e=>onSelectStudent(e.target.value)}>
                <option value="">Select a student...</option>
                {(students||[]).map(s => <option key={s.id || s.email} value={s.email}>{s.name ? `${s.name} (${s.email})` : s.email}</option>)}
              </select>
            </div>
            {loadingStudents && <span className="badge">Loading students…</span>}
            {studentError && <span style={{color:'var(--color-error)'}}>Could not load students: {studentError.message}</span>}
            {!loadingStudents && students.length===0 && !studentError && <span style={{color:'var(--color-muted)'}}>No students yet. Ask them to sign in so you can assign tasks.</span>}
            {activeAssigneeEmail && <span className="badge" style={{background:'var(--color-surface-alt)', color:'var(--color-text)'}}>Viewing {activeAssigneeEmail}</span>}
          </div>
        </div>
      )}
      <div className="section-header">
        <h2>Organization Tool</h2>
        <div className="view-controls">
          <button className={`view-btn ${view==='kanban'?'active':''}`} data-view="kanban" onClick={()=>setView('kanban')}><i className="fas fa-columns"></i> Kanban</button>
          <button className={`view-btn ${view==='list'?'active':''}`} data-view="list" onClick={()=>setView('list')}><i className="fas fa-list"></i> List</button>
          <button className={`view-btn ${view==='calendar'?'active':''}`} data-view="calendar" onClick={()=>setView('calendar')}><i className="fas fa-calendar"></i> Calendar</button>
          <button className={`view-btn ${view==='timeline'?'active':''}`} data-view="timeline" onClick={()=>setView('timeline')}><i className="fas fa-stream"></i> Timeline</button>
        </div>
        <button className="btn btn--primary btn--sm" onClick={openAdd} style={{marginLeft: 'auto'}} disabled={!canManageTasks}>
          <i className="fas fa-plus"/> Add Task
        </button>
      </div>

      <div className="folder-bar" aria-label="Task folders">
        <div className="folder-chips">
          <button className={`folder-chip ${selectedFolder==='all'?'active':''}`} onClick={()=>setSelectedFolder('all')} disabled={!canManageTasks}>All</button>
          <button className={`folder-chip ${selectedFolder==='none'?'active':''}`} onClick={()=>setSelectedFolder('none')} disabled={!canManageTasks}>No Folder</button>
          {(folders||[]).map(f => {
            const chipStyle = folderChipStyle(f, selectedFolder===f.id)
            return (
              <div key={f.id} className={`folder-chip folder-chip--with-actions ${selectedFolder===f.id?'active':''}`} style={chipStyle}>
                <button onClick={()=>setSelectedFolder(f.id)} disabled={!canManageTasks} title={f.color ? `Color ${f.color}` : undefined}>
                  {f.color && <span className="folder-chip__swatch" style={{ background: f.color }}/>}
                  {f.name}
                </button>
                <div className="folder-chip__actions">
                  <button aria-label="Rename folder" onClick={()=>renameFolder(f)} disabled={!canManageTasks}><i className="fas fa-pen"/></button>
                  <button aria-label="Delete folder" onClick={()=>deleteFolder(f.id)} disabled={!canManageTasks}><i className="fas fa-trash"/></button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="folder-create-trigger">
          <button className="btn btn--outline btn--sm" type="button" onClick={()=>setShowFolderForm(v=>!v)} disabled={!canManageTasks}>
            <i className="fas fa-folder-plus"/> Add Folder
          </button>
          {showFolderForm && (
            <div className="folder-create-card">
              <form onSubmit={(e)=>{ e.preventDefault(); addFolder() }}>
                <div className="folder-create__fields">
                  <label className="folder-create__label" htmlFor="newFolderName">Add folder</label>
                  <input
                    id="newFolderName"
                    type="text"
                    placeholder="Workspace, Capstone, Personal..."
                    value={newFolderName}
                    onChange={e=>setNewFolderName(e.target.value)}
                    className="form-control folder-name-input"
                    disabled={!canManageTasks}
                  />
                  <div className="folder-color-picker" aria-label="Optional folder color">
                    <label className="color-toggle">
                      <input type="checkbox" checked={useFolderColor} onChange={e=>setUseFolderColor(e.target.checked)} disabled={!canManageTasks} />
                      <span>Color</span>
                    </label>
                    <input
                      type="color"
                      value={newFolderColor}
                      onChange={e=>{ setNewFolderColor(e.target.value); setUseFolderColor(true) }}
                      disabled={!useFolderColor || !canManageTasks}
                      title="Pick a folder color"
                      className="folder-color-picker__input"
                    />
                    <button type="button" className="link-btn" onClick={()=>setUseFolderColor(false)} disabled={!canManageTasks || !useFolderColor}>No color</button>
                  </div>
                  <p className="folder-create__hint">Color shows up on chips and calendar dots; leave it off for neutral folders.</p>
                </div>
                <div className="folder-create__actions">
                  <button className="btn btn--outline btn--sm" type="button" onClick={()=>setShowFolderForm(false)}>Cancel</button>
                  <button className="btn btn--primary btn--sm" type="submit" disabled={!canManageTasks || !newFolderName.trim()}><i className="fas fa-folder-plus"/> Add Folder</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {isSupervisor && !activeAssigneeEmail && (
        <div className="deadline-empty" style={{marginTop:12}}>
          Select a student to view and assign their tasks.
        </div>
      )}

      {view==='kanban' && (
        <div id="kanban-view" className="task-view active">
          <div className="kanban-board">
            {[['pending','Pending'],['in_progress','In Progress'],['completed','Completed']].map(([status,label])=> (
              <div className="kanban-column" key={status} data-status={status.replace('_','-')}
                   onDragOver={e=>e.preventDefault()} onDrop={e=>onDropTo(status,e)}>
                <h3>{label}</h3>
                <div className="kanban-column__body">
                  {(lists[status]||[]).map(t=> (
                    <TaskCard key={t.id} task={t} onEdit={openEdit} onDelete={onDelete} onSubtasksChanged={(taskId, items)=>{
                      setSubProgress(prev => ({...prev, [taskId]: { done: items.filter(i=>i.done).length, total: items.length }}))
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view==='list' && (
        <div id="list-view" className="task-view active">
          <div className="task-list">
            {(filteredTasks||[]).map(t => {
              const due = t.dueDate ? new Date(t.dueDate) : null
              const dueStr = due ? due.toLocaleDateString(undefined,{month:'short', day:'numeric'}) : ''
              const pri = (t.priority||'medium')
              const priClass = pri==='high'?'high': pri==='low'?'low':'medium'
              const status = (t.status||'pending')
              const sub = subProgress[t.id]
              const statusPct = sub && sub.total>0 ? Math.round((sub.done/sub.total)*100) : (status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0)
              const statusLabel = sub && sub.total>0 ? `${statusPct}% Complete` : (status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Pending')
              const toggleComplete = async (checked) => {
                try { await update(t.id, { status: checked ? 'completed' : 'pending' }, { forEmail: activeAssigneeEmail }) } catch(e) { alert(e?.message||'Failed to update') }
              }
              return (
                <div key={t.id} className={`task-list-item ${priClass}-priority`}>
                  {/* Urgency tooltip for list items */}
                  <div className="urgency-tooltip" role="tooltip">
                    {(() => {
                      const dueObj = t.dueDate ? new Date(t.dueDate) : null
                      let level='low', label='Low', note=''
                      if ((t.status||'')==='completed') { level='done'; label='Completed' }
                      else if (!dueObj) { level=priClass; label=pri[0].toUpperCase()+pri.slice(1)+' Priority'; note='No due date' }
                      else {
                        const today = new Date();
                        const ms = dueObj.setHours(0,0,0,0) - today.setHours(0,0,0,0)
                        const d = Math.floor(ms/(1000*60*60*24))
                        if (d < 0) { level='overdue'; label='Overdue'; note=`${Math.abs(d)} day${Math.abs(d)===1?'':'s'} ago` }
                        else if (d === 0) { level='urgent'; label='Due Today'; note='Finish soon' }
                        else if (d <= 1) { level='urgent'; label='Urgent'; note='Due tomorrow' }
                        else if (d <= 3) { level='high'; label='High'; note=`Due in ${d} days` }
                        else if (d <= 7) { level='medium'; label='Medium'; note=`Due in ${d} days` }
                        else { level='low'; label='Low'; note=`Due in ${d} days` }
                      }
                      return <><span className={`urgency-pill ${level}`}>{label}</span>{note && <span className="urgency-note">{note}</span>}</>
                    })()}
                  </div>
                  <div className="task-checkbox"><input type="checkbox" checked={status==='completed'} onChange={(e)=>toggleComplete(e.target.checked)} /></div>
                  <div className="task-details">
                    <h4>{t.title}</h4>
                    {t.description && <p>{t.description}</p>}
                    <div className="task-progress" title={`${statusLabel} (${statusPct}%)`}>
                      <div className="progress-bar"><div className="progress-fill" style={{width: `${statusPct}%`}}></div></div>
                      <span>{statusLabel}</span>
                    </div>
                  </div>
                  <div className="task-info">
                    <span className="due-date">{dueStr}</span>
                    <span className={`priority-badge ${priClass}`}>{pri[0].toUpperCase()+pri.slice(1)}</span>
                    {t.category && (
                      <span className={`category ${t.category.toLowerCase().replace(/\s+/g,'-')}`} style={{marginLeft:8}}>
                        {t.category}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view==='calendar' && (
        <div id="calendar-view" className="task-view active">
          <div className="calendar-header">
            <button id="prevMonth" className="calendar-nav-btn" onClick={()=>{
              setCalMonth(m => { const nm = (m+11)%12; if (m===0) setCalYear(y=>y-1); return nm })
            }}><i className="fas fa-chevron-left"/></button>
            <h3 id="calendarTitle">{monthName} {calYear}</h3>
            <button id="nextMonth" className="calendar-nav-btn" onClick={()=>{
              setCalMonth(m => { const nm = (m+1)%12; if (m===11) setCalYear(y=>y+1); return nm })
            }}><i className="fas fa-chevron-right"/></button>
          </div>
          <div className="calendar-sync">
            <div className="calendar-sync__row">
              <div className="calendar-sync__title">
                <i className="fas fa-cloud"></i> Google Calendar
              </div>
              <div className="calendar-sync__actions">
                {googleStatus.connected ? (
                  <>
                    <span className="calendar-sync__badge">Connected{googleStatus.email ? ` (${googleStatus.email})` : ''}</span>
                    <button className="btn btn--outline btn--sm" onClick={fetchGoogleEvents} disabled={googleLoading}>
                      {googleLoading ? 'Refreshing…' : 'Refresh'}
                    </button>
                  </>
                ) : (
                  <button className="btn btn--primary btn--sm" onClick={startGoogleConnect} disabled={googleConnecting}>
                    {googleConnecting ? 'Opening…' : 'Connect Google'}
                  </button>
                )}
              </div>
            </div>
            {googleError && <div className="calendar-sync__error">{googleError.message}</div>}
            {!googleStatus.connected && !googleError && (
              <div className="calendar-sync__hint">Link your Google Calendar to see events in this view.</div>
            )}
          </div>
          <div className="calendar-legend">
            <span className="legend-item">
              <span className="legend-swatch legend-google" aria-hidden="true" />
              <span>Google Calendar</span>
            </span>
            {folders && folders.some(f=>f.color) ? (
              (folders||[]).filter(f=>f.color).map(f => (
                <span key={f.id} className="legend-item">
                  <span className="legend-swatch" style={{ background: f.color }} aria-hidden="true" />
                  <span>{f.name}</span>
                </span>
              ))
            ) : (
              <span className="legend-note">Add a folder color to see it on the calendar.</span>
            )}
          </div>
          <div className="calendar-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> <div key={d} className="calendar-day-header">{d}</div>)}
            {days.map(cell => cell.empty ? <div key={cell.key} className="calendar-day empty"/> : (
              <div key={cell.key} className={`calendar-day ${cell.tasks.length>0? 'has-task':''} ${cell.deadlines && cell.deadlines.length>0 ? 'has-deadline':''}`}>
                <span className="day-number">{cell.day}</span>
                {(() => {
                  const hasItems = (cell.tasks && cell.tasks.length > 0) || (cell.deadlines && cell.deadlines.length > 0) || (cell.events && cell.events.length > 0)
                  if (!hasItems) return null
                  const today = new Date(); today.setHours(0,0,0,0)
                  const dateForCell = new Date(calYear, calMonth, cell.day); dateForCell.setHours(0,0,0,0)
                  const diffDays = Math.floor((dateForCell.getTime() - today.getTime())/(1000*60*60*24))
                  let level='low', label='Low', note=''
                  if (diffDays < 0) { level='done'; label='Past' }
                  else if (diffDays === 0) { level='urgent'; label='Due Today' }
                  else if (diffDays === 1) { level='urgent'; label='Urgent'; note='Tomorrow' }
                  else if (diffDays <= 3) { level='high'; label='High'; note=`In ${diffDays} days` }
                  else if (diffDays <= 7) { level='medium'; label='Medium'; note=`In ${diffDays} days` }
                  else { level='low'; label='Low'; note=`In ${diffDays} days` }
                  if (cell.deadlines && cell.deadlines.length>0) {
                    level = diffDays<=1 ? 'urgent' : (diffDays<=3 ? 'high' : level)
                    label = level==='urgent'?'Urgent': (level==='high'?'High':label)
                  }
                  return (
                    <div className="urgency-tooltip" role="tooltip">
                      <span className={`urgency-pill ${level}`}>{label}</span>
                      {note && <span className="urgency-note">{note}</span>}
                    </div>
                  )
                })()}
                {cell.tasks.map(t => {
                  const color = t.folderId ? (folderById[t.folderId]?.color || null) : null
                  const ring = color ? (hexToRgba(color, 0.35) || color) : null
                  const title = `${t.title}${t.dueDate? ' · '+new Date(t.dueDate).toLocaleString():''}${t.folderId && folderById[t.folderId]?.name ? ` · ${folderById[t.folderId].name}` : ''}`
                  return (
                    <div
                      key={t.id}
                      className={`task-dot ${t.priority||'medium'}`}
                      title={title}
                      style={color ? { background: color, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined } : undefined}
                    />
                  )
                })}
                {cell.events && cell.events.map(ev => (
                  <div
                    key={`ge-${ev.id}-${cell.day}`}
                    className="google-event-dot"
                    title={`${ev.summary}${ev.start ? ' · '+new Date(ev.start).toLocaleString() : ''}${ev.creatorEmail ? ' · '+ev.creatorEmail : ''}`}
                  />
                ))}
                {cell.deadlines && cell.deadlines.map((d,i) => <div key={`dl-${i}`} className="deadline-dot" title={`${d.title || d.task_title}${d.dueAt? ' · '+new Date(d.dueAt).toLocaleString():''}`}/>) }
                {cell.tasks.length>0 && (
                  <div className="day-tasks">
                    {cell.tasks.map(t=> {
                      const color = t.folderId ? (folderById[t.folderId]?.color || null) : null
                      const background = color ? (hexToRgba(color, 0.18) || color) : undefined
                      const border = color ? (hexToRgba(color, 0.4) || color) : undefined
                      return (
                        <div
                          key={t.id}
                          className="mini-task"
                          style={color ? { background: background, border: border ? `1px solid ${border}` : undefined, color: 'var(--color-text)' } : undefined}
                          title={t.folderId && folderById[t.folderId]?.name ? `${t.title} · ${folderById[t.folderId].name}` : t.title}
                        >
                          {t.title}
                        </div>
                      )
                    })}
                  </div>
                )}
                {cell.events && cell.events.length>0 && (
                  <div className="day-events">
                    {cell.events.map(ev => (
                      <div
                        key={`ev-${ev.id}-${cell.day}`}
                        className="mini-event"
                        title={ev.summary}
                      >
                        <i className="fas fa-calendar-alt" aria-hidden="true"></i> {ev.summary}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {view==='timeline' && (
        <div id="timeline-view" className="task-view active">
          <div className="timeline">
            {(() => {
              const hours = Array.from({ length: 24 }, (_, i) => i)
              const allDayTasks = plannerTasks.filter(t => !t._hasTime)
              const tasksByHour = hours.reduce((acc, hour) => { acc[hour] = []; return acc }, {})
              plannerTasks.forEach(t => {
                if (t._hasTime) {
                  const h = t._due.getHours()
                  if (tasksByHour[h]) tasksByHour[h].push(t)
                }
              })
              const allDayEvents = plannerEvents.allDay || []
              const eventsByHour = hours.reduce((acc, hour) => { acc[hour] = []; return acc }, {})
              ;(plannerEvents.timed || []).forEach(ev => {
                const h = ev._start ? ev._start.getHours() : null
                if (h != null && eventsByHour[h]) eventsByHour[h].push(ev)
              })
              const dayLabel = plannerDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
              const isToday = isSameDay(plannerDate, (()=>{ const d = new Date(); d.setHours(0,0,0,0); return d })())
              const formatHour = (h) => {
                const suffix = h >= 12 ? 'PM' : 'AM'
                const hour12 = ((h + 11) % 12) + 1
                return `${hour12}:00 ${suffix}`
              }
              return (
                <>
                  <div className="planner-controls">
                    <div className="planner-controls__nav">
                      <button className="btn btn--outline btn--sm" onClick={() => shiftPlannerDay(-1)} aria-label="Previous day"><i className="fas fa-chevron-left" /></button>
                      <div className="planner-controls__label">
                        <span>{dayLabel}</span>
                        {isToday && <span className="planner-today-pill">Today</span>}
                      </div>
                      <button className="btn btn--outline btn--sm" onClick={() => shiftPlannerDay(1)} aria-label="Next day"><i className="fas fa-chevron-right" /></button>
                    </div>
                    <div className="planner-controls__actions">
                      <button className="btn btn--outline btn--sm" onClick={resetPlannerToToday}>Jump to Today</button>
                    </div>
                  </div>

                  <div className="planner-quickadd">
                    <input
                      type="text"
                      placeholder="Add a task for this day"
                      value={plannerNewTitle}
                      onChange={e=>setPlannerNewTitle(e.target.value)}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); onAddPlannerTask() } }}
                    />
                    <label className="planner-quickadd__time">
                      <input type="checkbox" checked={plannerAllDay} onChange={e=>setPlannerAllDay(e.target.checked)} />
                      All day
                    </label>
                    <input
                      type="time"
                      value={plannerNewTime}
                      onChange={e=>setPlannerNewTime(e.target.value)}
                      disabled={plannerAllDay}
                      aria-label="Time"
                    />
                    <select value={plannerNewPriority} onChange={e=>setPlannerNewPriority(e.target.value)} aria-label="Priority">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <select value={plannerNewFolder} onChange={e=>setPlannerNewFolder(e.target.value)} aria-label="Folder">
                      <option value="auto">Use current filter</option>
                      <option value="none">No folder</option>
                      {(folders||[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <button className="btn btn--primary btn--sm" onClick={onAddPlannerTask}>Add</button>
                  </div>

                  {plannerTasks.length === 0 && plannerEvents.allDay?.length===0 && plannerEvents.timed?.length===0 && (
                    <div className="deadline-empty">No tasks or events on this day</div>
                  )}

                  {(plannerTasks.length > 0 || plannerEvents.allDay?.length || plannerEvents.timed?.length) && (
                    <div className="day-planner">
                      {(allDayTasks.length > 0 || allDayEvents.length > 0) && (
                        <div className="planner-all-day">
                          <div className="planner-all-day__label">
                            <i className="fas fa-sun" aria-hidden="true"></i> All-day / no time
                          </div>
                          <div className="planner-all-day__items">
                            {allDayTasks.map(t => {
                              const color = t.folderId ? (folderById[t.folderId]?.color || null) : null
                              const accent = color ? { borderLeftColor: color, background: hexToRgba(color, 0.12) || undefined } : undefined
                              return (
                                <div key={t.id} className={`planner-task ${t.priority || 'medium'}`} style={accent} title={t.title}>
                                  <div className="planner-task__title">{t.title}</div>
                                  <div className="planner-task__meta">
                                    {t.folderId && folderById[t.folderId]?.name && (
                                      <span className="planner-task__folder">{folderById[t.folderId].name}</span>
                                    )}
                                    <span className="planner-task__priority">{(t.priority || 'medium').replace('_',' ')}</span>
                                  </div>
                                </div>
                              )
                            })}
                            {allDayEvents.map(ev => (
                              <div key={`g-${ev.id}`} className="planner-event" title={ev.summary}>
                                <div className="planner-event__title">
                                  <i className="fas fa-calendar-alt" aria-hidden="true"></i> {ev.summary}
                                </div>
                                <div className="planner-event__meta">
                                  {ev.creatorEmail && <span className="planner-event__owner">{ev.creatorEmail}</span>}
                                  {ev.calendarEmail && <span className="planner-event__calendar">{ev.calendarEmail}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="planner-grid">
                        {hours.map(hour => {
                          const slotTasks = tasksByHour[hour] || []
                          return (
                            <div key={hour} className="planner-row">
                              <div className="planner-hour-label">{formatHour(hour)}</div>
                              <div className="planner-slot" onClick={()=>handleSlotClick(hour)} title="Click to set time for quick add">
                                {slotTasks.map(t => {
                                  const color = t.folderId ? (folderById[t.folderId]?.color || null) : null
                                  const accent = color ? { borderLeftColor: color, background: hexToRgba(color, 0.14) || undefined } : undefined
                                  const time = t._due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                                  return (
                                    <div key={t.id} className={`planner-task ${t.priority || 'medium'}`} style={accent} title={t.title}>
                                      <div className="planner-task__title">
                                        <span className="planner-task__time">{time}</span>
                                        {t.title}
                                      </div>
                                      <div className="planner-task__meta">
                                        {t.folderId && folderById[t.folderId]?.name && (
                                          <span className="planner-task__folder">{folderById[t.folderId].name}</span>
                                        )}
                                        <span className="planner-task__priority">{(t.priority || 'medium').replace('_',' ')}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                                {(eventsByHour[hour] || []).map(ev => (
                                  <div key={`gev-${ev.id}-${hour}`} className="planner-event">
                                    <div className="planner-event__title">
                                      <span className="planner-event__time">{ev._timeLabel}</span>
                                      <i className="fas fa-calendar-alt" aria-hidden="true"></i> {ev.summary}
                                    </div>
                                    <div className="planner-event__meta">
                                      {ev.creatorEmail && <span className="planner-event__owner">{ev.creatorEmail}</span>}
                                      {ev.calendarEmail && <span className="planner-event__calendar">{ev.calendarEmail}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      <AddEditTaskModal open={modalOpen} task={editing} folders={folders} defaultFolderId={defaultFolderId} assigneeEmail={activeAssigneeEmail} onClose={()=>{ setModalOpen(false); setEditing(null) }} onSave={onSaveTask} />
    </section>
  )
}







