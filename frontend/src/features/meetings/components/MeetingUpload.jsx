import { useState } from 'react'
import { useMeetingUpload } from '../../../lib/hooks/useMeetingUpload.js'

export default function MeetingUpload({ onUploaded }) {
  const [title, setTitle] = useState('')
  const [fileKey, setFileKey] = useState(0)
  const [file, setFile] = useState(null)
  const [localError, setLocalError] = useState('')
  const { upload, uploading, error } = useMeetingUpload()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setLocalError('Select a recording before uploading.')
      return
    }
    setLocalError('')
    try {
      const created = await upload(file, { title })
      if (created && typeof onUploaded === 'function') {
        onUploaded(created)
      }
      setTitle('')
      setFile(null)
      setFileKey((k) => k + 1)
    } catch {
      // Error state handled by hook
    }
  }

  return (
    <form className="meeting-upload" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="meetingTitle">Meeting title</label>
        <input
          id="meetingTitle"
          className="form-control"
          type="text"
          placeholder="Optional – defaults to file name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="meetingFile">Recording file</label>
        <input
          key={fileKey}
          id="meetingFile"
          type="file"
          accept="audio/*,video/*"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null)
            setLocalError('')
          }}
        />
        <small className="form-hint">Accepts audio or video files. Max size 500MB.</small>
      </div>
      {(localError || error) && (
        <div className="form-error">
          {localError || error?.message}
        </div>
      )}
      <button className="btn btn--outline" type="submit" disabled={uploading}>
        {uploading ? 'Uploading & processing…' : 'Upload recording'}
      </button>
    </form>
  )
}
