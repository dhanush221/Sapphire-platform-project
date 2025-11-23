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

async function http(path, options = {}) {
  const user = JSON.parse(localStorage.getItem('sapphireUser') || '{}')
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (user?.role) headers['x-user-role'] = user.role
  if (user?.email) headers['x-user-email'] = user.email
  if (user?.name) headers['x-user-name'] = user.name
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
    throw new Error(data?.error || bodySnippet || `${res.status} ${res.statusText}` + (hint ? `\n${hint}` : ''))
  }
  // Return parsed data when JSON, or an empty object otherwise
  return data ?? {}
}

export const api = {
  // Tasks
  listTasks: () => http('/tasks'),
  createTask: (body) => http('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id, body) => http(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (id) => http(`/tasks/${id}`, { method: 'DELETE' }),
  reorderTasks: (updates) => http('/tasks/reorder', { method: 'PATCH', body: JSON.stringify({ updates }) }),

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
  listOfficialResources: async () => ({ resources: mockOfficialResources }),
  listPersonalResources: async () => {
    const items = readPersonalStore()
    return { resources: items }
  },
  uploadPersonalResource: async (formData) => {
    const title = formData.get('title') || 'Untitled'
    const tags = (formData.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean)
    const resource = {
      id: Date.now(),
      title,
      resourceType: formData.get('resourceType') || 'Routine',
      notes: formData.get('notes') || '',
      tags,
      originalFileName: formData.get('file')?.name || 'file',
      fileSize: formData.get('file')?.size || 0,
      downloadUrl: '#',
      previewUrl: '',
      previewType: 'document',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      starred: false
    }
    const next = [resource, ...readPersonalStore()]
    writePersonalStore(next)
    return { resource, message: 'Resource added locally (mock).' }
  },
  updatePersonalResource: async (id, payload) => {
    const items = readPersonalStore()
    const updated = items.map((r) => (r.id === id ? { ...r, ...payload, updatedAt: new Date().toISOString() } : r))
    writePersonalStore(updated)
    const resource = updated.find((r) => r.id === id)
    return { resource }
  },
  deletePersonalResource: async (id) => {
    const filtered = readPersonalStore().filter((r) => r.id !== id)
    writePersonalStore(filtered)
    return { ok: true }
  },

  // Generic
  get: (p) => http(p),
  post: (p, b) => http(p, { method: 'POST', body: JSON.stringify(b) }),
  put: (p, b) => http(p, { method: 'PUT', body: JSON.stringify(b) }),
  del: (p) => http(p, { method: 'DELETE' }),
}

const mockOfficialResources = [
  {
    id: 1,
    title: 'Neurodiversity Workplace Guide',
    description: 'Evidence-based guide for autistic interns and supervisors to co-create supports.',
    category: 'Workplace rights',
    credibility: 'verified',
    badgeLabel: 'Verified',
    sourceOrg: 'UK Civil Service',
    sourceUrl: 'https://www.civilservice.gov.uk',
    downloadUrl: 'https://www.civilservice.gov.uk',
    tags: ['accommodations', 'communication', 'checklist']
  },
  {
    id: 2,
    title: 'Sensory Regulation Toolkit',
    description: 'Planner to map sensory needs and design predictable routines.',
    category: 'Sensory regulation',
    credibility: 'trusted',
    badgeLabel: 'Trusted',
    sourceOrg: 'Autistica',
    sourceUrl: 'https://www.autistica.org.uk',
    downloadUrl: 'https://www.autistica.org.uk',
    tags: ['sensory', 'regulation', 'planner']
  }
]

function readPersonalStore() {
  try {
    const raw = localStorage.getItem('sapphirePersonalResources') || '[]'
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writePersonalStore(items) {
  try {
    localStorage.setItem('sapphirePersonalResources', JSON.stringify(items))
  } catch {}
}

export default api;
