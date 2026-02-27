import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { setUnauthorizedHandler } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sapphireUser') || 'null') } catch { return null }
  })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      if (user) localStorage.setItem('sapphireUser', JSON.stringify(user))
      else localStorage.removeItem('sapphireUser')
    } catch { }
  }, [user])

  // Global 401 handler: clear auth state when backend says unauthorized
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  // Hydrate from server session on app load
  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

      ; (async () => {
        try {
          const resp = await api.currentUser({ signal: controller.signal })
          if (!alive) return
          if (resp?.user) setUser(resp.user)
          else setUser(null)
        } catch (err) {
          if (!alive) return
          // Any auth error or timeout -> treat as logged out
          setUser(null)
        } finally {
          clearTimeout(timeoutId)
          if (alive) setHydrated(true)
        }
      })()
    return () => {
      alive = false
      controller.abort()
    }
  }, [])

  const login = useCallback((u) => setUser(u || null), [])
  const logout = useCallback(() => setUser(null), [])
  const updateUser = useCallback((partial) => setUser(prev => ({ ...(prev || {}), ...(partial || {}) })), [])

  const value = useMemo(() => ({ user, login, logout, updateUser, hydrated }), [user, login, logout, updateUser, hydrated])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
