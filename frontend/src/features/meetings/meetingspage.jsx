import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import MeetingUpload from './components/MeetingUpload.jsx'
import MeetingList from './components/MeetingList.jsx'
import MeetingDetails from './components/MeetingDetails.jsx'

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const selectedMeeting = useMemo(() => {
    if (!meetings.length) return null
    return meetings.find((m) => m.id === selectedId) || meetings[0]
  }, [meetings, selectedId])

  const loadMeetings = useCallback(async (query) => {
    setLoading(true)
    setError(null)
    try {
      const path = query ? `/api/meetings?q=${encodeURIComponent(query)}` : '/api/meetings'
      const data = await api.get(path)
      const list = Array.isArray(data) ? data : (Array.isArray(data?.meetings) ? data.meetings : [])
      setMeetings(list)
      setSelectedId((current) => {
        if (!list.length) return null
        return list.some((item) => item.id === current) ? current : list[0].id
      })
    } catch (err) {
      console.error('Failed to load meetings', err)
      setError(err.message || 'Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMeetings() }, [loadMeetings])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const term = search.trim()
    if (term) {
      loadMeetings(term)
    } else {
      loadMeetings()
    }
  }

  const handleSearchReset = () => {
    setSearch('')
    loadMeetings()
  }

  const handleToggleAction = async (action, overrides = {}) => {
    const meeting = meetings.find(m => m.id === selectedId)
    if (!meeting || !action?.id) return
    try {
      const payload = { ...overrides }
      if (!payload.status && 'completed' in payload === false) {
        payload.completed = !(String(action.status||action.completed).toLowerCase() === 'done' || action.completed)
      }
      const updated = await api.updateMeetingActionItem(meeting.id, action.id, payload)
      setMeetings(list => list.map(m => m.id === updated.id ? updated : m))
      setSelectedId(updated.id)
    } catch (err) {
      console.error('Failed to update action item', err)
      setError(err.message || 'Failed to update action')
    }
  }

  const handleUploaded = (meeting) => {
    if (!meeting) {
      loadMeetings()
      return
    }
    setMeetings((current) => {
      const filtered = current.filter((m) => m.id !== meeting.id)
      return [meeting, ...filtered]
    })
    setSelectedId(meeting.id ?? null)
  }

  return (
    <section id="meetings" className="content-section active">
      <div className="section-header">
        <h2>Meeting Transcription & Notes</h2>
        <form className="meeting-search" onSubmit={handleSearchSubmit}>
          <div className="search-box">
            <input
              type="text"
              className="form-control"
              placeholder="Search by title, transcript, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fas fa-search"></i>
          </div>
          <button type="submit" className="btn btn--secondary btn--sm">Search</button>
          <button type="button" className="btn btn--outline btn--sm" onClick={handleSearchReset}>Reset</button>
        </form>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="meetings-grid meetings-grid--two-column">
        <div className="card">
          <div className="card__header"><h3>Upload Recording</h3></div>
          <div className="card__body">
            <MeetingUpload onUploaded={handleUploaded} />
          </div>
        </div>

        <div className="card">
          <div className="card__header"><h3>Recent Meetings</h3></div>
          <div className="card__body">
            {loading ? <p className="muted">Loading meetings…</p> : <MeetingList meetings={meetings} selectedId={selectedId} onSelect={setSelectedId} />}
          </div>
        </div>
      </div>

      <div className="card meeting-details" id="meetingDetails">
        <div className="card__header"><h3>{selectedMeeting?.title || 'Meeting Details'}</h3></div>
        <div className="card__body">
          <MeetingDetails meeting={selectedMeeting} onToggleAction={handleToggleAction} />
        </div>
      </div>
    </section>
  )
}
