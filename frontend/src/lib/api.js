// React-friendly facade over existing API
// Centralized API base resolution supporting VITE_API_URL and VITE_API_BASE
export const API_BASE = (() => {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {}
  const configured = env.VITE_API_URL || env.VITE_API_BASE
  if (configured) return String(configured).replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.protocol}//${window.location.host}`
  }
  return 'http://localhost:5000'
})()

export function resolveApiUrl(resourcePath = '') {
  if (!resourcePath) return ''
  if (/^https?:\/\//i.test(resourcePath)) return resourcePath
  const path = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`
  return `${API_BASE}${path}`
}

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : null;
}

async function http(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = { ...(options.headers || {}) }
  if (!isFormData && options.method && options.method !== 'GET') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  const url = path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`
  const res = await fetch(url, { headers, credentials: 'include', ...options })
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()
  let data = null
  if (ct.includes('application/json')) {
    try { data = text ? JSON.parse(text) : null } catch { data = null }
  }
  if (!res.ok) {
    const bodySnippet = (text || '').slice(0, 200)
    // Helpful hint if frontend dev server answered instead of API
    const sameOrigin = (typeof window !== 'undefined') && `${window.location.protocol}//${window.location.host}` === API_BASE
    const hint = !ct.includes('application/json') && sameOrigin
      ? 'Hint: In dev, set VITE_API_BASE to your backend URL (e.g., http://localhost:5000).'
      : ''
    if (res.status === 401 && typeof unauthorizedHandler === 'function') {
      try { unauthorizedHandler() } catch {}
    }
    throw new Error(data?.error || bodySnippet || `${res.status} ${res.statusText}` + (hint ? `\n${hint}` : ''))
  }
  // Return parsed data when JSON, or an empty object otherwise
  return data ?? {}
}

export const api = {
  // Tasks
  listTasks: (params) => {
    let query = ''
    if (params) {
      const search = new URLSearchParams()
      const email = typeof params === 'string' ? params : params.forEmail
      if (email) search.set('forEmail', email)
      query = search.toString() ? `?${search.toString()}` : ''
    }
    return http(`/tasks${query}`)
  },
  createTask: (body) => http('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id, body) => http(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (id) => http(`/tasks/${id}`, { method: 'DELETE' }),
  reorderTasks: (updates) => http('/tasks/reorder', { method: 'PATCH', body: JSON.stringify({ updates }) }),
  listFolders: (params) => {
    let query = ''
    if (params) {
      const search = new URLSearchParams()
      const email = typeof params === 'string' ? params : params.forEmail
      if (email) search.set('forEmail', email)
      query = search.toString() ? `?${search.toString()}` : ''
    }
    return http(`/folders${query}`)
  },
  createFolder: (body) => http('/folders', { method: 'POST', body: JSON.stringify(body) }),
  updateFolder: (id, body) => http(`/folders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteFolder: (id) => http(`/folders/${id}`, { method: 'DELETE' }),
  listUsers: (params) => {
    let query = ''
    if (params && params.role) {
      const search = new URLSearchParams()
      search.set('role', params.role)
      query = `?${search.toString()}`
    }
    return http(`/users${query}`)
  },

  // Deadlines
  upcomingDeadlines: () => http('/deadlines/upcoming'),
  createDeadline: (body) => http('/deadlines', { method: 'POST', body: JSON.stringify(body) }),

  // Help Requests
  createHelpRequest: (body) => http('/api/help-requests', { method: 'POST', body: JSON.stringify(body) }),
  listHelpRequests: () => http('/api/help-requests'),

  // Subtasks
  listSubtasks: (taskId) => http(`/tasks/${taskId}/subtasks`),
  createSubtask: (taskId, body) => http(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateSubtask: (id, body) => http(`/subtasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSubtask: (id) => http(`/subtasks/${id}`, { method: 'DELETE' }),

  // Meetings
  updateMeetingActionItem: (meetingId, actionId, body) => http(`/api/meetings/${meetingId}/action-items/${actionId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Resources (frontend-friendly mocks; replace with real API when available)
  listOfficialResources: () => http('/api/resources/official'),
  listPersonalResources: () => http('/api/resources'),
  uploadPersonalResource: (formData) => http('/api/resources', { method: 'POST', body: formData }),
  updatePersonalResource: (id, payload) => http(`/api/resources/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePersonalResource: (id) => http(`/api/resources/${id}`, { method: 'DELETE' }),

  // Auth
  login: (body) => http('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => http('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => http('/api/auth/logout', { method: 'POST' }),
  currentUser: () => http('/api/auth/me'),
  requestPasswordReset: (email) => http('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body) => http('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  // Generic
  get: (p) => http(p),
  post: (p, b) => http(p, { method: 'POST', body: JSON.stringify(b) }),
  put: (p, b) => http(p, { method: 'PUT', body: JSON.stringify(b) }),
  del: (p) => http(p, { method: 'DELETE' }),
}

export default api;
