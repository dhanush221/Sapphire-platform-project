import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

export function useTasks(initial = [], options = {}) {
  const [tasks, setTasks] = useState(initial)
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
      const data = await api.listTasks(targetEmail ? { forEmail: targetEmail } : undefined)
      setTasks(data)
    } catch (e) {
      setError(e)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh({ forEmail: currentEmail }) }, [refresh])
  useEffect(() => { emailRef.current = currentEmail }, [currentEmail])

  const create = useCallback(async (body, opts = {}) => {
    await api.createTask(body)
    await refresh({ forEmail: opts.forEmail ?? currentEmail })
  }, [refresh, currentEmail])
  const update = useCallback(async (id, body, opts = {}) => {
    await api.updateTask(id, body)
    await refresh({ forEmail: opts.forEmail ?? currentEmail })
  }, [refresh, currentEmail])
  const remove = useCallback(async (id, opts = {}) => {
    await api.deleteTask(id)
    await refresh({ forEmail: opts.forEmail ?? currentEmail })
  }, [refresh, currentEmail])
  const reorder = useCallback(async (updates, opts = {}) => {
    await api.reorderTasks(updates)
    await refresh({ forEmail: opts.forEmail ?? currentEmail })
  }, [refresh, currentEmail])

  return { tasks, loading, error, refresh, create, update, remove, reorder, currentEmail }
}
