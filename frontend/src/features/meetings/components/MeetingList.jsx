function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function summarize(text, fallback = 'Summary pending') {
  if (!text) return fallback
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > 120 ? `${normalized.slice(0, 117)}…` : normalized
}

export default function MeetingList({ meetings = [], selectedId, onSelect }) {
  if (!meetings.length) {
    return <p className="empty-state">No recordings yet. Upload your first meeting to get AI notes.</p>
  }

  return (
    <ul className="meeting-list">
      {meetings.map((meeting, idx) => (
        <li key={meeting.id ?? `temp-${idx}`}>
          <button
            type="button"
            onClick={() => onSelect && onSelect(meeting.id)}
            className={`meeting-list__item ${meeting.id === selectedId ? 'active' : ''}`}
          >
            <div className="meeting-list__title">{meeting.title}</div>
            <div className="meeting-list__meta">
              <span>{formatDate(meeting.createdAt || meeting.date)}</span>
              <span>•</span>
              <span>{summarize(meeting.summary)}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
