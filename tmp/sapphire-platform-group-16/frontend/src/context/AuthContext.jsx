import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sapphireUser') || 'null') } catch { return null }
  })

  useEffect(() => {
    try {
      if (user) localStorage.setItem('sapphireUser', JSON.stringify(user))
      else localStorage.removeItem('sapphireUser')
    } catch {}
  }, [user])

  const login = useCallback((u) => setUser(u || null), [])
  const logout = useCallback(() => setUser(null), [])
  const updateUser = useCallback((partial) => setUser(prev => ({ ...(prev || {}), ...(partial || {}) })), [])

  const value = useMemo(() => ({ user, login, logout, updateUser }), [user, login, logout, updateUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

