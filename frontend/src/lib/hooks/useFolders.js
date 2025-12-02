import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'

export function useFolders(initial = []) {
  const [folders, setFolders] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api.listFolders()
      setFolders(data)
    } catch (e) {
      setError(e)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (body) => { await api.createFolder(body); await refresh() }, [refresh])
  const update = useCallback(async (id, body) => { await api.updateFolder(id, body); await refresh() }, [refresh])
  const remove = useCallback(async (id) => { await api.deleteFolder(id); await refresh() }, [refresh])

  return { folders, loading, error, refresh, create, update, remove }
}
