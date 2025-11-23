import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'

export function useTasks(initial = []) {
  const [tasks, setTasks] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api.listTasks()
      setTasks(data)
    } catch (e) {
      setError(e)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (body) => { await api.createTask(body); await refresh() }, [refresh])
  const update = useCallback(async (id, body) => { await api.updateTask(id, body); await refresh() }, [refresh])
  const remove = useCallback(async (id) => { await api.deleteTask(id); await refresh() }, [refresh])
  const reorder = useCallback(async (updates) => { await api.reorderTasks(updates); await refresh() }, [refresh])

  return { tasks, loading, error, refresh, create, update, remove, reorder }
}

