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
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to load deadlines')
      console.error(err)
      setError(err)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (body) => {
    try {
      await api.createDeadline(body)
      await refresh()
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to create deadline')
      setError(err)
      throw err
    }
  }, [refresh])

  return { deadlines, loading, error, refresh, create }
}
