import { useEffect, useMemo, useState } from 'react'
import { resolveApiUrl } from '../../../lib/api.js'

function formatRecordedOn(meeting) {
  const source = meeting?.createdAt || meeting?.date
  if (!source) return 'Unknown date'
  try {
    return new Date(source).toLocaleString()
  } catch {
    return source
  }
}

function toSummaryList(summary) {
  if (!summary) return []
  const rows = summary
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]+\s*/, '').trim())
    .filter(Boolean)
  if (!rows.length) return []
  return rows
}

function toTranscriptLines(text) {
  if (!text) return []
  return text.split(/\n+/).map((line) => line.trim()).filter(Boolean)
}

export default function MeetingDetails({ meeting, onToggleAction }) {
  const [tab, setTab] = useState('summary')
  const [drafts, setDrafts] = useState({})
  useEffect(() => { setTab('summary') }, [meeting?.id])
  useEffect(() => { setDrafts({}) }, [meeting?.id])

  const summaryItems = useMemo(() => toSummaryList(meeting?.summary), [meeting?.summary])
  const transcriptLines = useMemo(() => toTranscriptLines(meeting?.transcript), [meeting?.transcript])
  const audioSrc = meeting?.recordingUrl ? resolveApiUrl(meeting.recordingUrl) : null
  const actionItems = Array.isArray(meeting?.actionItems) ? meeting.actionItems : []

  const formatDue = (value) => {
    if (!value) return 'No due date'
    try { return new Date(value).toLocaleString() } catch { return value }
  }

  const updateDraft = (id, patch) => {
    setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  }

  const currentDraft = (item) => {
    const base = drafts[item.id] || {}
    return {
      assignee: base.assignee ?? item.assignee ?? '',
      dueAt: base.dueAt ?? (item.dueAt ? item.dueAt.slice(0,10) : ''),
      status: base.status ?? (item.status || (item.completed ? 'done' : 'pending'))
    }
  }

  if (!meeting) {
    return <p className="empty-state">Select a meeting to review AI notes, transcript, and action items.</p>
  }

  return (
    <div>
      <div className="meeting-meta">
        <div>
          <p className="meeting-meta__label">Recorded</p>
          <p className="meeting-meta__value">{formatRecordedOn(meeting)}</p>
        </div>
        {audioSrc && (
          <audio className="meeting-audio" controls src={audioSrc}>
            Your browser does not support audio playback.
          </audio>
        )}
      </div>

      <div className="meeting-tabs">
        <button className={`tab-btn ${tab === 'transcript' ? 'active' : ''}`} onClick={() => setTab('transcript')} data-tab="transcript">Transcript</button>
        <button className={`tab-btn ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')} data-tab="summary">Summary</button>
        <button className={`tab-btn ${tab === 'actions' ? 'active' : ''}`} onClick={() => setTab('actions')} data-tab="actions">Action Items</button>
      </div>

      <div id="transcript" className={`tab-content ${tab === 'transcript' ? 'active' : ''}`}>
        {transcriptLines.length ? (
          <div className="transcript">
            {transcriptLines.map((line, idx) => (
              <div key={idx} className="speaker-line">
                <span className="text">{line}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">Transcript will appear after processing completes.</p>
        )}
      </div>

      <div id="summary" className={`tab-content ${tab === 'summary' ? 'active' : ''}`}>
        <div className="meeting-summary">
          <h4>Key discussion points</h4>
          {summaryItems.length ? (
            <ul>
              {summaryItems.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          ) : (
            <p className="empty-state">No summary captured yet.</p>
          )}
        </div>
      </div>

      <div id="actions" className={`tab-content ${tab === 'actions' ? 'active' : ''}`}>
        <div className="action-items">
          <h4>Action Items</h4>
          {actionItems.length ? actionItems.map((item, idx) => {
            const status = String(item.status || (item.completed ? 'done' : 'pending')).toLowerCase()
            const checked = status === 'done'
            const draft = currentDraft(item)
            return (
              <div key={item.id || idx} className="action-item">
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleAction && onToggleAction(item, { status: checked ? 'pending' : 'done' })}
                  />
                  <span>{item.text}</span>
                  <span className={`assignee status-${status}`}>{status}</span>
                </div>
                <div className="action-item-meta">
                  <div className="action-item-field">
                    <label>Assignee</label>
                    <input
                      type="text"
                      value={draft.assignee}
                      onChange={(e)=> updateDraft(item.id, { assignee: e.target.value })}
                      placeholder="Add assignee"
                    />
                  </div>
                  <div className="action-item-field">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={draft.dueAt}
                      onChange={(e)=> updateDraft(item.id, { dueAt: e.target.value })}
                    />
                  </div>
                  <div className="action-item-field">
                    <label>Status</label>
                    <select value={draft.status} onChange={(e)=> updateDraft(item.id, { status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div className="action-item-field">
                    <small>Due: {formatDue(item.dueAt)}</small>
                  </div>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={()=> onToggleAction && onToggleAction(item, drafts[item.id] ? drafts[item.id] : draft)}
                  >
                    Update
                  </button>
                </div>
              </div>
            )
          }) : (
            <p className="empty-state">No action items detected.</p>
          )}
        </div>
      </div>
    </div>
  )
}
