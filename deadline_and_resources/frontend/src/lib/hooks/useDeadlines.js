import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'

export function useDeadlines(initial = []) {
  const [deadlines, setDeadlines] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api.upcomingDeadlines()
      setDeadlines(data)
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (body) => { await api.createDeadline(body); await refresh() }, [refresh])

  return { deadlines, loading, error, refresh, create }
}

