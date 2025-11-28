import { useCallback, useEffect, useMemo, useState, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Modal from '../../components/Modal.jsx'
import { useTasks } from '../../lib/hooks/useTasks'
import { useDeadlines } from '../../lib/hooks/useDeadlines'
import { useFolders } from '../../lib/hooks/useFolders'
import { api } from '../../lib/api'

const TaskCard = memo(function TaskCard({ task, onEdit, onDelete, onSubtasksChanged }) {
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null
  const due = dueDateObj ? dueDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
  const [open, setOpen] = useState(false)
  const [subs, setSubs] = useState([])
  const [newSub, setNewSub] = useState('')

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
              <label><input type="checkbox" checked={!!s.done} onChange={()=>toggleDone(s)} /> <span style={{textDecoration: s.done?'line-through':'none'}}>{s.title}</span></label>
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

const AddEditTaskModal = memo(function AddEditTaskModal({ open, task, onClose, onSave, folders, defaultFolderId }) {
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
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
        <button className="btn btn--primary" onClick={()=> onSave({ title: title.trim(), dueDate: dueDate ? new Date(dueDate).toISOString() : null, priority, category: category?.trim() || null, folderId })}>Save</button>
      </div>
    </Modal>
  )
})

export default function TasksPage() {
  const { tasks, refresh, create, update, remove, reorder } = useTasks()
  const { deadlines } = useDeadlines()
  const { folders, create: createFolder, remove: removeFolder, update: updateFolder } = useFolders()
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

  const filteredTasks = useMemo(() => {
    if (selectedFolder === 'all') return tasks || []
    if (selectedFolder === 'none') return (tasks||[]).filter(t => !t.folderId)
    return (tasks||[]).filter(t => t.folderId === selectedFolder)
  }, [tasks, selectedFolder])

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
    await reorder(updates)
  }, [lists, reorder])

  const [calMonth, setCalMonth] = useState(()=> new Date().getMonth())
  const [calYear, setCalYear] = useState(()=> new Date().getFullYear())
  const monthName = useMemo(()=> ['January','February','March','April','May','June','July','August','September','October','November','December'][calMonth], [calMonth])

  const days = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const cells = []
    for (let i=0;i<firstDay;i++) cells.push({ empty:true, key:`e-${i}` })
    for (let d=1; d<=daysInMonth; d++) {
      const dayDate = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const t = (tasks||[]).filter(x => x.dueDate && x.dueDate.startsWith && x.dueDate.startsWith(dayDate))
      const dl = (deadlines||[]).filter(x => x.dueAt && x.dueAt.startsWith && x.dueAt.startsWith(dayDate))
      cells.push({ empty:false, day:d, key:`d-${d}`, tasks:t, deadlines:dl })
    }
    return cells
  }, [tasks, deadlines, calMonth, calYear])

  const onSaveTask = async (payload) => {
    if (!payload.title) { alert('Title is required'); return }
    try {
      if (editing) await update(editing.id, payload)
      else await create(payload)
      setModalOpen(false); setEditing(null)
    } catch (e) {
      alert(e?.message || 'Failed to save task. If you are running the frontend dev server, set VITE_API_BASE to your backend URL.')
    }
  }

  const openAdd = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (t) => { setEditing(t); setModalOpen(true) }
  const onDelete = async (t) => { if (confirm('Delete this task?')) { await remove(t.id) } }
  const addFolder = async () => {
    const name = prompt('Folder name')
    if (!name) return
    try { await createFolder({ name: name.trim() }) } catch (e) { alert(e?.message || 'Failed to create folder') }
  }
  const deleteFolder = async (id) => {
    if (!confirm('Delete this folder? Tasks inside will be left unfiled.')) return
    try { await removeFolder(id); setSelectedFolder('all') } catch (e) { alert(e?.message || 'Failed to delete folder') }
  }
  const renameFolder = async (folder) => {
    const name = prompt('New folder name', folder.name)
    if (!name) return
    try { await updateFolder(folder.id, { name: name.trim() }) } catch (e) { alert(e?.message || 'Failed to rename folder') }
  }

  const defaultFolderId = useMemo(() => {
    if (selectedFolder === 'all' || selectedFolder === 'none') return null
    return selectedFolder
  }, [selectedFolder])

  return (
    <section id="tasks" className="content-section active">
      <div className="section-header">
        <h2>Organization Tool</h2>
        <div className="view-controls">
          <button className={`view-btn ${view==='kanban'?'active':''}`} data-view="kanban" onClick={()=>setView('kanban')}><i className="fas fa-columns"></i> Kanban</button>
          <button className={`view-btn ${view==='list'?'active':''}`} data-view="list" onClick={()=>setView('list')}><i className="fas fa-list"></i> List</button>
          <button className={`view-btn ${view==='calendar'?'active':''}`} data-view="calendar" onClick={()=>setView('calendar')}><i className="fas fa-calendar"></i> Calendar</button>
          <button className={`view-btn ${view==='timeline'?'active':''}`} data-view="timeline" onClick={()=>setView('timeline')}><i className="fas fa-stream"></i> Timeline</button>
        </div>
        <button className="btn btn--primary btn--sm" onClick={openAdd} style={{marginLeft: 'auto'}}>
          <i className="fas fa-plus"/> Add Task
        </button>
      </div>

      <div className="folder-bar" aria-label="Task folders">
        <div className="folder-chips">
          <button className={`folder-chip ${selectedFolder==='all'?'active':''}`} onClick={()=>setSelectedFolder('all')}>All</button>
          <button className={`folder-chip ${selectedFolder==='none'?'active':''}`} onClick={()=>setSelectedFolder('none')}>No Folder</button>
          {(folders||[]).map(f => (
            <div key={f.id} className={`folder-chip folder-chip--with-actions ${selectedFolder===f.id?'active':''}`}>
              <button onClick={()=>setSelectedFolder(f.id)}>{f.name}</button>
              <div className="folder-chip__actions">
                <button aria-label="Rename folder" onClick={()=>renameFolder(f)}><i className="fas fa-pen"/></button>
                <button aria-label="Delete folder" onClick={()=>deleteFolder(f.id)}><i className="fas fa-trash"/></button>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn--outline btn--sm" onClick={addFolder}><i className="fas fa-folder-plus"/> New Folder</button>
      </div>

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
            {(tasks||[]).map(t => {
              const due = t.dueDate ? new Date(t.dueDate) : null
              const dueStr = due ? due.toLocaleDateString(undefined,{month:'short', day:'numeric'}) : ''
              const pri = (t.priority||'medium')
              const priClass = pri==='high'?'high': pri==='low'?'low':'medium'
              const status = (t.status||'pending')
              const sub = subProgress[t.id]
              const statusPct = sub && sub.total>0 ? Math.round((sub.done/sub.total)*100) : (status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0)
              const statusLabel = sub && sub.total>0 ? `${statusPct}% Complete` : (status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Pending')
              const toggleComplete = async (checked) => {
                try { await update(t.id, { status: checked ? 'completed' : 'pending' }) } catch(e) { alert(e?.message||'Failed to update') }
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
          <div className="calendar-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> <div key={d} className="calendar-day-header">{d}</div>)}
            {days.map(cell => cell.empty ? <div key={cell.key} className="calendar-day empty"/> : (
              <div key={cell.key} className={`calendar-day ${cell.tasks.length>0? 'has-task':''} ${cell.deadlines && cell.deadlines.length>0 ? 'has-deadline':''}`}>
                <span className="day-number">{cell.day}</span>
                {(() => {
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
                {cell.tasks.map(t => <div key={t.id} className={`task-dot ${t.priority||'medium'}`} title={`${t.title}${t.dueDate? ' · '+new Date(t.dueDate).toLocaleString():''}`}/>) }
                {cell.deadlines && cell.deadlines.map((d,i) => <div key={`dl-${i}`} className="deadline-dot" title={`${d.title || d.task_title}${d.dueAt? ' · '+new Date(d.dueAt).toLocaleString():''}`}/>) }
                {cell.tasks.length>0 && (
                  <div className="day-tasks">
                    {cell.tasks.map(t=> <div key={t.id} className="mini-task">{t.title}</div>)}
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
              const items = (tasks||[]).filter(t=>t.dueDate).sort((a,b)=> new Date(a.dueDate)-new Date(b.dueDate))
              if (items.length===0) return <div className="deadline-empty">No tasks with due dates</div>
              const start = new Date(items[0].dueDate); start.setHours(0,0,0,0)
              const end = new Date(start); end.setDate(start.getDate()+14)
              const days = []; const cursor = new Date(start)
              while (cursor <= end) { days.push(new Date(cursor)); cursor.setDate(cursor.getDate()+1) }
              const dayWidth = 90
              return (
                <div>
                  <div className="timeline-days" style={{display:'flex'}}>
                    {days.map((d,i)=> <div key={i} className="timeline-day" style={{width:dayWidth}}>{d.toLocaleDateString(undefined,{month:'short', day:'numeric'})}</div>)}
                  </div>
                  <div className="timeline-rows">
                    {items.map(t=>{
                      const due = new Date(t.dueDate); due.setHours(0,0,0,0)
                      const offset = Math.max(0, Math.round((due - start)/(1000*60*60*24)))
                      return (
                        <div key={t.id} className="timeline-row">
                          <div className={`timeline-item ${t.priority||'medium'}`} style={{left: offset*dayWidth}} title={t.title}>
                            <span className="timeline-title">{t.title}</span>
                            <span className="timeline-date">{new Date(t.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      <AddEditTaskModal open={modalOpen} task={editing} folders={folders} defaultFolderId={defaultFolderId} onClose={()=>{ setModalOpen(false); setEditing(null) }} onSave={onSaveTask} />
    </section>
  )
}







