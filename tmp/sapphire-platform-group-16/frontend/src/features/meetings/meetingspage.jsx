import { useRef, useState } from 'react'
import { useMeetingUpload } from '../../lib/hooks/useMeetingUpload'

export default function MeetingsPage() {
  const [tab, setTab] = useState('transcript')
  const fileRef = useRef(null)
  const { upload, uploading, error, result } = useMeetingUpload()

  const onSubmit = async (e) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return alert('Select a recording first!')
    await upload(file)
    setTab('summary')
  }

  const meeting = result?.meeting || null

  return (
    <section id="meetings" className="content-section active">
      <div className="section-header">
        <h2>Meeting Transcription & Notes</h2>
        <div className="search-box">
          <input type="text" className="form-control" placeholder="Search meetings..." />
          <i className="fas fa-search"></i>
        </div>
      </div>

      <div className="meetings-grid">
        <div className="card">
          <div className="card__header"><h3>Recent Meetings</h3></div>
          <div className="card__body">
            <div className="meeting-item">
              <div className="meeting-info">
                <h4>Upload and Transcribe</h4>
                <p>Attach an audio file to generate transcript and notes</p>
              </div>
              <form id="meetingUploadForm" onSubmit={onSubmit} style={{display:'flex', gap: 8, alignItems:'center'}}>
                <input id="meetingFile" type="file" ref={fileRef} accept="audio/*" />
                <button id="meetingUploadBtn" className="btn btn--outline btn--sm" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
              </form>
            </div>
            {error && <div className="error">Upload failed: {error.message}</div>}
          </div>
        </div>

        <div className="card meeting-details" id="meetingDetails">
          <div className="card__header"><h3>{meeting?.title || 'Meeting Details'}</h3></div>
          <div className="card__body">
            <div className="meeting-tabs">
              <button className={`tab-btn ${tab==='transcript'?'active':''}`} onClick={()=>setTab('transcript')} data-tab="transcript">Transcript</button>
              <button className={`tab-btn ${tab==='summary'?'active':''}`} onClick={()=>setTab('summary')} data-tab="summary">Summary</button>
              <button className={`tab-btn ${tab==='actions'?'active':''}`} onClick={()=>setTab('actions')} data-tab="actions">Action Items</button>
            </div>

            {tab==='transcript' && (
              <div id="transcript" className="tab-content active">
                <div className="transcript">
                  <div className="speaker-line"><span className="speaker">Sarah:</span><span className="text">Good morning everyone, let's start with our weekly standup...</span></div>
                  <div className="speaker-line"><span className="speaker">Alex:</span><span className="text">This week I focused on the data analysis...</span></div>
                </div>
              </div>
            )}

            {tab==='summary' && (
              <div id="summary" className="tab-content active">
                <div className="meeting-summary">
                  <h4>Key Discussion Points</h4>
                  <ul>
                    {(meeting?.summary ? [meeting.summary] : ['Add your summary after upload.']).map((s,i)=>(<li key={i}>{s}</li>))}
                  </ul>
                </div>
              </div>
            )}

            {tab==='actions' && (
              <div id="actions" className="tab-content active">
                <div className="action-items">
                  <h4>Action Items</h4>
                  {(meeting?.actionItems||[{text:'Example action item'}]).map((ai,idx)=> (
                    <div key={idx} className="action-item">
                      <input type="checkbox" id={`action${idx}`} />
                      <label htmlFor={`action${idx}`}>{ai.text}</label>
                      <span className="assignee"></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
