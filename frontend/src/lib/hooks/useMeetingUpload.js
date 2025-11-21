import { useCallback, useState } from 'react'
import { API_BASE } from '../api.js'

// Minimal hook to POST a File to the existing /api/meetings/upload endpoint.
export function useMeetingUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const upload = useCallback(async (file, options = {}) => {
    if (!file) throw new Error('No file provided for upload')
    setUploading(true); setError(null); setResult(null)
    try {
      const BASE = API_BASE
      const form = new FormData()
      form.append('audio', file)
      const title = typeof options.title === 'string' ? options.title.trim() : ''
      if (title) form.append('title', title)
      const user = JSON.parse(localStorage.getItem('sapphireUser') || '{}')
      const headers = {}
      if (user?.email) headers['x-user-email'] = user.email
      if (user?.role) headers['x-user-role'] = user.role
      if (user?.name) headers['x-user-name'] = user.name
      const res = await fetch(`${BASE}/api/meetings/upload`, {
        method: 'POST',
        headers,
        body: form,
        credentials: 'include',
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : null
      if (!res.ok) throw new Error(data?.error || res.statusText)
      setResult(data)
      return data?.meeting || null
    } catch (e) {
      setError(e)
      throw e
    } finally { setUploading(false) }
  }, [])

  return { upload, uploading, error, result }
}
