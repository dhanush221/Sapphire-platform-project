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

export default function MeetingDetails({ meeting }) {
  const [tab, setTab] = useState('summary')
  useEffect(() => { setTab('summary') }, [meeting?.id])

  if (!meeting) {
    return <p className="empty-state">Select a meeting to review AI notes, transcript, and action items.</p>
  }

  const summaryItems = useMemo(() => toSummaryList(meeting.summary), [meeting.summary])
  const transcriptLines = useMemo(() => toTranscriptLines(meeting.transcript), [meeting.transcript])
  const audioSrc = meeting.recordingUrl ? resolveApiUrl(meeting.recordingUrl) : null
  const actionItems = Array.isArray(meeting.actionItems) ? meeting.actionItems : []

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
          {actionItems.length ? actionItems.map((item, idx) => (
            <div key={item.id || idx} className="action-item">
              <input type="checkbox" readOnly checked={String(item.status).toLowerCase() === 'done'} />
              <label>{item.text}</label>
              <span className={`assignee status-${String(item.status || 'pending').toLowerCase()}`}>{item.status || 'pending'}</span>
            </div>
          )) : (
            <p className="empty-state">No action items detected.</p>
          )}
        </div>
      </div>
    </div>
  )
}
