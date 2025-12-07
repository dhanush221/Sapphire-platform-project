import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'sapphirePreferences'

const defaultPreferences = {
  theme: 'auto',
  highContrast: false,
  fontSize: 'medium',
  notifications: {
    taskReminders: true,
    meetingNotifications: true,
    breakReminders: false
  },
  accessibility: {
    reduceMotion: false,
    screenReader: true,
    keyboardNav: true
  }
}

const PreferencesContext = createContext({
  preferences: defaultPreferences,
  setTheme: () => {},
  setFontSize: () => {},
  setHighContrast: () => {},
  setNotification: () => {},
  setAccessibility: () => {}
})

const mergePreferences = (data) => {
  if (!data || typeof data !== 'object') return defaultPreferences
  return {
    ...defaultPreferences,
    ...data,
    notifications: {
      ...defaultPreferences.notifications,
      ...(data.notifications || {})
    },
    accessibility: {
      ...defaultPreferences.accessibility,
      ...(data.accessibility || {})
    }
  }
}

const getPrefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const applyPreferencesToDom = (prefs) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const body = document.body
  const { theme, highContrast, fontSize, accessibility } = prefs

  const normalizedTheme = ['dark','light','auto'].includes(theme) ? theme : 'auto'
  if (normalizedTheme === 'dark') root.setAttribute('data-color-scheme', 'dark')
  else if (normalizedTheme === 'light') root.setAttribute('data-color-scheme', 'light')
  else root.removeAttribute('data-color-scheme')

  body.classList.toggle('high-contrast', !!highContrast)

  const fontMap = { small: '12px', medium: '14px', large: '16px' }
  root.style.setProperty('--font-size-base', fontMap[fontSize] || '14px')

  const shouldReduceMotion = !!accessibility?.reduceMotion || getPrefersReducedMotion()
  root.classList.toggle('reduce-motion', shouldReduceMotion)
  if (shouldReduceMotion) root.setAttribute('data-reduce-motion', 'true')
  else root.removeAttribute('data-reduce-motion')
}

const readPreferences = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    const prefs = saved ? mergePreferences(JSON.parse(saved)) : defaultPreferences
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    applyPreferencesToDom(prefs)
    return prefs
  } catch {
    return defaultPreferences
  }
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => readPreferences())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // ignore storage failures
    }
  }, [preferences])

  useLayoutEffect(() => {
    applyPreferencesToDom(preferences)
  }, [preferences])

  const value = useMemo(() => ({
    preferences,
    setTheme: (theme) => setPreferences(prev => {
      const allowed = ['auto','light','dark']
      return { ...prev, theme: allowed.includes(theme) ? theme : 'auto' }
    }),
    setFontSize: (fontSize) => setPreferences(prev => ({ ...prev, fontSize })),
    setHighContrast: (highContrast) => setPreferences(prev => ({ ...prev, highContrast })),
    setNotification: (key, value) => setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    })),
    setAccessibility: (key, value) => setPreferences(prev => ({
      ...prev,
      accessibility: { ...prev.accessibility, [key]: value }
    }))
  }), [preferences])

  useEffect(() => {
    const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    if (!media) return
    const handler = () => setPreferences(prev => ({
      ...prev,
      accessibility: { ...prev.accessibility, reduceMotion: prev.accessibility.reduceMotion || media.matches }
    }))
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  return useContext(PreferencesContext)
}
