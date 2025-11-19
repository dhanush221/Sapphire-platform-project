import { useCallback, useState } from 'react'
import { API_BASE } from '../api.js'

// Minimal hook to POST a File to the existing /api/meetings/upload endpoint.
export function useMeetingUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const upload = useCallback(async (file) => {
    setUploading(true); setError(null); setResult(null)
    try {
      const BASE = API_BASE
      const form = new FormData()
      form.append('audio', file)
      const user = JSON.parse(localStorage.getItem('sapphireUser') || '{}')
      const res = await fetch(`${BASE}/api/meetings/upload`, {
        method: 'POST',
        headers: user?.email ? { 'x-user-email': user.email } : {},
        body: form,
        credentials: 'include',
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : null
      if (!res.ok) throw new Error(data?.error || res.statusText)
      setResult(data)
    } catch (e) { setError(e) } finally { setUploading(false) }
  }, [])

  return { upload, uploading, error, result }
}
