import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

export function useFolders(initial = [], options = {}) {
  const [folders, setFolders] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentEmail, setCurrentEmail] = useState(options.initialForEmail || null)
  const emailRef = useRef(options.initialForEmail || null)

  const refresh = useCallback(async (opts = {}) => {
    const targetEmail = (opts && Object.prototype.hasOwnProperty.call(opts, 'forEmail'))
      ? (opts.forEmail || null)
      : emailRef.current;
    emailRef.current = targetEmail || null
    setCurrentEmail(targetEmail || null)
    setLoading(true); setError(null)
    try {
      const data = await api.listFolders(targetEmail ? { forEmail: targetEmail } : undefined)
      setFolders(data)
    } catch (e) {
      setError(e)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh({ forEmail: currentEmail }) }, [refresh])
  useEffect(() => { emailRef.current = currentEmail }, [currentEmail])

  const create = useCallback(async (body, opts = {}) => { await api.createFolder(body); await refresh({ forEmail: opts.forEmail ?? currentEmail }) }, [refresh, currentEmail])
  const update = useCallback(async (id, body, opts = {}) => { await api.updateFolder(id, body); await refresh({ forEmail: opts.forEmail ?? currentEmail }) }, [refresh, currentEmail])
  const remove = useCallback(async (id, opts = {}) => { await api.deleteFolder(id); await refresh({ forEmail: opts.forEmail ?? currentEmail }) }, [refresh, currentEmail])

  return { folders, loading, error, refresh, create, update, remove, currentEmail }
}
