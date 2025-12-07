import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTasks } from '../../lib/hooks/useTasks'
import { useDeadlines } from '../../lib/hooks/useDeadlines'
import { api } from '../../lib/api'

function TaskCard({ task, onEdit, onDelete, onSubtasksChanged }) {
  const due = task.dueDate ? new Date(task.dueDate).toLocaleString() : ''
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
  return (
    <div className={`task-card priority-${task.priority||'medium'}`} data-task-id={task.id} draggable onDragStart={(e)=>{
      e.dataTransfer.setData('text/plain', String(task.id))
    }}>
      <div className="task-title">{task.title}</div>
      <div className="task-meta">{due}</div>
      <div className="task-actions">
        <button className="btn-edit" title="Edit" onClick={()=>onEdit(task)}><i className="fas fa-pen"/></button>
        <button className="btn-delete" title="Delete" onClick={()=>onDelete(task)}><i className="fas fa-trash"/></button>
      </div>
      <div className="task-progress" title={`${pct}% Complete`} style={{marginTop:8}}>
        <div className="progress-bar"><div className="progress-fill" style={{width: `${pct}%`}}></div></div>
      </div>
      {cat && (
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:8}}>
          <span className={`category-badge cat-${catSlug}`}>{cat}</span>
        </div>
      )}
      <button className="btn btn--outline btn--sm" style={{marginTop:8}} onClick={()=>setOpen(v=>!v)}>{open?'Hide Checklist':'Show Checklist'}</button>
      {open && (
        <div className="task-subtasks" style={{marginTop:8}}>
          {(subs||[]).map(s => (
            <div key={s.id} className="subtask-row">
              <label><input type="checkbox" checked={!!s.done} onChange={()=>toggleDone(s)} /> <span style={{textDecoration: s.done?'line-through':'none'}}>{s.title}</span></label>
              <button className="btn-st-delete" onClick={()=>deleteSub(s)}><i className="fas fa-trash"/></button>
            </div>
          ))}
          <div className="subtask-add">
            <input type="text" placeholder="Add a checklist item..." value={newSub} onChange={e=>setNewSub(e.target.value)} />
            <button className="btn btn--primary btn--sm" onClick={addSub}>Add</button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddEditTaskModal({ open, task, onClose, onSave }) {
  const [title, setTitle] = useState(task?.title || '')
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.substring(0,10) : '')
  const [priority, setPriority] = useState(task?.priority || 'medium')
  const [category, setCategory] = useState(task?.category || '')

  // Keep fields in sync if task changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(task?.title || '')
      setDueDate(task?.dueDate ? task.dueDate.substring(0,10) : '')
      setPriority(task?.priority || 'medium')
      setCategory(task?.category || '')
    }
  }, [open, task])

  if (!open) return null
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h3 id="taskModalTitle">{task ? 'Edit Task' : 'Add Task'}</h3>
        <label>Title</label>
        <input type="text" value={title} onChange={e=>setTitle(e.target.value)} />
        <label>Due Date</label>
        <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
        <label>Priority</label>
        <select value={priority} onChange={e=>setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <label>Category</label>
        <input type="text" placeholder="e.g., Meetings, Learning, Project Work" value={category} onChange={e=>setCategory(e.target.value)} />
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={()=> onSave({ title: title.trim(), dueDate: dueDate ? new Date(dueDate).toISOString() : null, priority, category: category?.trim() || null })}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const { tasks, refresh, create, update, remove, reorder } = useTasks()
  const { deadlines } = useDeadlines()
  const [view, setView] = useState('kanban')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [subProgress, setSubProgress] = useState({})

  const lists = useMemo(() => {
    const by = { pending: [], in_progress: [], completed: [] }
    ;(tasks||[]).forEach(t => { (by[t.status || 'pending'] || (by[t.status||'pending']=[])).push(t) })
    Object.values(by).forEach(arr => arr.sort((a,b)=> (a.orderIndex??0)-(b.orderIndex??0)))
    return by
  }, [tasks])

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

  return (
    <section id="tasks" className="content-section active">
      <div className="section-header">
        <h2>Organization Tool</h2>
        <div className="view-controls">
          <button className={`view-btn ${view==='kanban'?'active':''}`} data-view="kanban" onClick={()=>setView('kanban')}><i className="fas fa-columns"></i> Kanban</button>
          <button className={`view-btn ${view==='list'?'active':''}`} data-view="list" onClick={()=>setView('list')}><i className="fas fa-list"></i> List</button>
          <button className={`view-btn ${view==='calendar'?'active':''}`} data-view="calendar" onClick={()=>setView('calendar')}><i className="fas fa-calendar"></i> Calendar</button>
        </div>
        <button className="btn btn--primary btn--sm" onClick={openAdd} style={{marginLeft: 'auto'}}>
          <i className="fas fa-plus"/> Add Task
        </button>
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
                    {t.category && <span className={`category-badge cat-${t.category.toLowerCase().replace(/\s+/g,'-')}`} style={{marginLeft:8}}>{t.category}</span>}
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

      <AddEditTaskModal open={modalOpen} task={editing} onClose={()=>{ setModalOpen(false); setEditing(null) }} onSave={onSaveTask} />
    </section>
  )
}
