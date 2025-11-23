import { useEffect, useMemo, useRef, useState } from 'react'
import api, { API_BASE } from '../../lib/api.js'
import Modal from '../../components/Modal.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const RESOURCE_TYPES = ['Routine', 'Template', 'Sensory Tool', 'Communication Aid', 'Document', 'Other']
const TAG_OPTIONS = [
  { value: 'routine', label: 'Routine' },
  { value: 'sensory-tool', label: 'Sensory Tool' },
  { value: 'communication', label: 'Communication' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'document', label: 'Document' }
]
const PERSONAL_FILTERS = [{ value: 'all', label: 'All' }, { value: 'favorites', label: 'Starred' }, ...TAG_OPTIONS]
const CATEGORY_ICONS = {
  'Workplace rights': 'fa-scale-balanced',
  'Legal rights': 'fa-balance-scale',
  'Communication supports': 'fa-comments',
  'Self-advocacy': 'fa-bullhorn',
  'Policy & advocacy': 'fa-briefcase',
  'Wellness & regulation': 'fa-heart',
  'Sensory regulation': 'fa-wave-square',
  Communication: 'fa-comment-dots',
  Documentation: 'fa-file-alt'
}
const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpg,.jpeg,.svg,.docx,.txt,.mp3,.wav'

export default function ResourcesPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('official')
  const [officialState, setOfficialState] = useState({ items: [], loading: true, error: null, search: '' })
  const [personalState, setPersonalState] = useState({ items: [], loading: true, error: null })
  const [personalFilter, setPersonalFilter] = useState('all')
  const [selectedTags, setSelectedTags] = useState(['routine'])
  const [uploadForm, setUploadForm] = useState({ title: '', resourceType: 'Routine', notes: '', customTags: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState({ message: '', error: '' })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [previewData, setPreviewData] = useState(null)

  useEffect(() => {
    loadOfficialResources()
    loadPersonalResources()
  }, [])

  const loadOfficialResources = async () => {
    setOfficialState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.listOfficialResources()
      setOfficialState((prev) => ({ ...prev, items: data?.resources || [], loading: false }))
    } catch (err) {
      setOfficialState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Unable to load resources.'
      }))
    }
  }

  const loadPersonalResources = async () => {
    setPersonalState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.listPersonalResources()
      setPersonalState({ items: sortPersonalResources(data?.resources || []), loading: false, error: null })
    } catch (err) {
      setPersonalState({ items: [], loading: false, error: err?.message || 'Unable to load your resources.' })
    }
  }

  const groupedOfficial = useMemo(() => {
    const query = officialState.search.trim().toLowerCase()
    const filtered = !query
      ? officialState.items
      : officialState.items.filter((item) =>
          [item.title, item.description, item.category, item.sourceOrg, ...(item.tags || [])].some((value) =>
            String(value || '').toLowerCase().includes(query)
          )
        )
    const map = filtered.reduce((acc, resource) => {
      const key = resource.category || 'General'
      acc[key] = acc[key] || []
      acc[key].push(resource)
      return acc
    }, {})
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [officialState.items, officialState.search])

  const filteredPersonal = useMemo(() => {
    if (personalFilter === 'favorites') return personalState.items.filter((item) => item.starred)
    if (personalFilter === 'all') return personalState.items
    return personalState.items.filter((item) => item.tags?.includes(personalFilter))
  }, [personalState.items, personalFilter])

  const handleTagToggle = (value) => {
    setSelectedTags((prev) => (prev.includes(value) ? prev.filter((tag) => tag !== value) : [...prev, value]))
  }

  const handleFileChange = (file) => {
    setSelectedFile(file || null)
    if (file && !uploadForm.title) {
      setUploadForm((prev) => ({ ...prev, title: deriveTitle(file.name) }))
    }
  }

  const resetUploadForm = () => {
    setUploadForm({ title: '', resourceType: 'Routine', notes: '', customTags: '' })
    setSelectedTags(['routine'])
    setSelectedFile(null)
    setUploadStatus({ message: '', error: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    if (!selectedFile) return setUploadStatus({ message: '', error: 'Attach a file to upload.' })
    if (!uploadForm.title.trim()) return setUploadStatus({ message: '', error: 'Please enter a short title.' })

    const tags = normalizeTags([...selectedTags, ...uploadForm.customTags.split(',')])
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', uploadForm.title.trim())
    if (uploadForm.resourceType) formData.append('resourceType', uploadForm.resourceType)
    if (uploadForm.notes.trim()) formData.append('notes', uploadForm.notes.trim())
    if (tags.length) formData.append('tags', tags.join(','))

    setUploading(true)
    setUploadStatus({ message: '', error: '' })
    try {
      const response = await api.uploadPersonalResource(formData)
      if (response?.resource) {
        setPersonalState((prev) => ({
          ...prev,
          items: sortPersonalResources([response.resource, ...prev.items.filter((item) => item.id !== response.resource.id)])
        }))
      } else {
        await loadPersonalResources()
      }
      setUploadStatus({ message: response?.message || 'Your resource has been added. You can access it anytime.', error: '' })
      setActiveTab('personal')
      resetUploadForm()
    } catch (err) {
      setUploadStatus({ message: '', error: err?.message || 'Upload failed. Try again.' })
    } finally {
      setUploading(false)
    }
  }

  const handleFavorite = async (resource) => {
    try {
      const result = await api.updatePersonalResource(resource.id, { starred: !resource.starred })
      if (result?.resource) {
        setPersonalState((prev) => ({
          ...prev,
          items: sortPersonalResources(prev.items.map((item) => (item.id === resource.id ? result.resource : item)))
        }))
      } else {
        await loadPersonalResources()
      }
    } catch (err) {
      alert(err?.message || 'Unable to update favorite status.')
    }
  }

  const handleDelete = async (resource) => {
    const confirmDelete = window.confirm('Delete this resource? This action cannot be undone.')
    if (!confirmDelete) return
    try {
      await api.deletePersonalResource(resource.id)
      setPersonalState((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== resource.id)
      }))
    } catch (err) {
      alert(err?.message || 'Unable to delete resource.')
    }
  }

  const handleEditResource = async (id, payload) => {
    const updates = {}
    if ('title' in payload) updates.title = payload.title?.trim()
    if ('tags' in payload) updates.tags = normalizeTags(payload.tags.split(','))
    if ('notes' in payload) updates.notes = payload.notes?.trim() || ''
    if (!updates.title) throw new Error('Title cannot be empty.')
    try {
      const result = await api.updatePersonalResource(id, updates)
      if (result?.resource) {
        setPersonalState((prev) => ({
          ...prev,
          items: sortPersonalResources(prev.items.map((item) => (item.id === id ? result.resource : item)))
        }))
      } else {
        await loadPersonalResources()
      }
    } catch (err) {
      throw new Error(err?.message || 'Unable to save changes.')
    }
  }

  return (
    <section id="resources" className="content-section active">
      <div className="section-header">
        <div>
          <h2>Resource Library</h2>
          <p className="muted">Official guides stay separate from your personal uploads.</p>
        </div>
      </div>

      <div className="resource-tabs">
        {[
          { id: 'official', label: 'Official Resources', icon: 'fa-landmark', count: officialState.items.length },
          { id: 'personal', label: 'Personal Resources', icon: 'fa-lock', count: personalState.items.length },
          { id: 'upload', label: 'Upload New', icon: 'fa-cloud-upload-alt' }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`resource-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`fas ${tab.icon}`} aria-hidden />
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && <span className="badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'official' && (
        <OfficialPanel
          state={officialState}
          grouped={groupedOfficial}
          onPreview={(resource) => setPreviewData({ kind: 'official', resource })}
          onSearch={(value) => setOfficialState((prev) => ({ ...prev, search: value }))}
        />
      )}

      {activeTab === 'personal' && (
        <PersonalPanel
          state={personalState}
          filtered={filteredPersonal}
          filter={personalFilter}
          setFilter={setPersonalFilter}
          onUploadClick={() => setActiveTab('upload')}
          onPreview={(resource) => setPreviewData({ kind: 'personal', resource })}
          onDownload={(resource) => window.open(composeUrl(resource.downloadUrl, user?.email), '_blank')}
          onDelete={handleDelete}
          onStar={handleFavorite}
          onEdit={handleEditResource}
        />
      )}

      {activeTab === 'upload' && (
        <UploadPanel
          form={uploadForm}
          setForm={setUploadForm}
          selectedTags={selectedTags}
          onToggleTag={handleTagToggle}
          onResetTags={() => setSelectedTags(['routine'])}
          selectedFile={selectedFile}
          onFileChange={handleFileChange}
          fileInputRef={fileInputRef}
          uploadStatus={uploadStatus}
          onSubmit={handleUpload}
          uploading={uploading}
        />
      )}

      <PreviewModal preview={previewData} onClose={() => setPreviewData(null)} userEmail={user?.email} />
    </section>
  )
}

function OfficialPanel({ state, grouped, onPreview, onSearch }) {
  return (
    <div className="resource-panel card">
      <div className="card__header">
        <div>
          <h3>Official & Credible Guides</h3>
          <p className="muted">Government, universities, nonprofits, and research-backed toolkits.</p>
        </div>
        <div className="search-box" style={{ maxWidth: 280 }}>
          <input
            type="search"
            placeholder="Search titles, categories, or sources..."
            value={state.search}
            onChange={(e) => onSearch(e.target.value)}
            className="form-control"
          />
          <i className="fas fa-search" aria-hidden />
        </div>
      </div>
      <div className="card__body">
        {state.loading && <p className="muted">Loading resources...</p>}
        {state.error && <div className="error">{state.error}</div>}
        {!state.loading && !state.error && grouped.length === 0 && <p className="muted">No matches for that search.</p>}
        <div className="resources-grid">
          {grouped.map(([category, resources]) => (
            <div className="card" key={category}>
              <div className="card__header">
                <h3>
                  <i className={`fas ${CATEGORY_ICONS[category] || 'fa-book-open'}`} aria-hidden /> {category}
                </h3>
              </div>
              <div className="card__body">
                {resources.map((resource) => (
                  <div className="resource-item" key={resource.id}>
                    <div className="resource-icon">
                      <i className="fas fa-link" aria-hidden />
                    </div>
                    <div className="resource-info">
                      <h4>{resource.title}</h4>
                      <p>{resource.description}</p>
                      <div className="resource-meta">
                        <span className={`credibility-badge badge--${resource.credibility}`}>{resource.badgeLabel}</span>
                        <span className="muted">{resource.sourceOrg}</span>
                      </div>
                      <div className="resource-tags">
                        {(resource.tags || []).map((tag) => (
                          <span key={tag} className="tag-pill">#{tag}</span>
                        ))}
                      </div>
                      <div className="resource-actions">
                        <button className="btn btn--outline btn--sm" onClick={() => onPreview(resource)}>
                          Preview
                        </button>
                        <a className="btn btn--primary btn--sm" href={resource.downloadUrl} target="_blank" rel="noreferrer">
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PersonalPanel({ state, filtered, filter, setFilter, onUploadClick, onPreview, onDownload, onDelete, onStar, onEdit }) {
  return (
    <div className="resource-panel card">
      <div className="card__header">
        <div>
          <h3>Personal Resource Vault</h3>
          <p className="muted">Only visible to you. Keep routines, scripts, sensory tools, and calming sounds in one place.</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={onUploadClick}>
          <i className="fas fa-cloud-upload-alt" aria-hidden /> Upload
        </button>
      </div>
      <div className="resource-filters">
        {PERSONAL_FILTERS.map((option) => (
          <button
            key={option.value}
            className={`filter-chip ${filter === option.value ? 'active' : ''}`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="card__body">
        {state.loading && <p className="muted">Loading your resources...</p>}
        {state.error && <div className="error">{state.error}</div>}
        {!state.loading && !state.error && filtered.length === 0 && (
          <div className="empty-state">
            <p>No personal resources yet.</p>
            <p className="muted">Use the Upload button to add routines, planners, or calming files.</p>
          </div>
        )}
        <div className="resources-grid personal-grid">
          {filtered.map((resource) => (
            <PersonalResourceCard
              key={resource.id}
              resource={resource}
              onPreview={onPreview}
              onDownload={onDownload}
              onDelete={onDelete}
              onStar={onStar}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PersonalResourceCard({ resource, onPreview, onDownload, onDelete, onStar, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: resource.title, tags: (resource.tags || []).join(', '), notes: resource.notes || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm({ title: resource.title, tags: (resource.tags || []).join(', '), notes: resource.notes || '' })
    setEditing(false)
    setError('')
    setSaving(false)
  }, [resource.id, resource.title, resource.tags, resource.notes])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await onEdit(resource.id, form)
      setEditing(false)
    } catch (err) {
      setError(err?.message || 'Unable to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card personal-card">
      <div className="card__header">
        <div>
          {editing ? (
            <input
              className="form-control"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          ) : (
            <h3>{resource.title}</h3>
          )}
          <p className="muted">{resource.resourceType || 'Personal resource'} • Added {formatDate(resource.createdAt)}</p>
        </div>
        <button
          className={`resource-star ${resource.starred ? 'active' : ''}`}
          onClick={() => onStar(resource)}
          aria-label={resource.starred ? 'Remove star' : 'Star resource'}
        >
          <i className="fas fa-star" aria-hidden />
        </button>
      </div>
      <div className="card__body">
        <div className="resource-file-meta">
          <span>{resource.originalFileName}</span>
          <span>{formatBytes(resource.fileSize)}</span>
        </div>
        {editing ? (
          <>
            <label className="form-label">Tags</label>
            <input
              className="form-control"
              value={form.tags}
              placeholder="routine, sensory-tool"
              onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
            />
            <label className="form-label">Notes</label>
            <textarea
              rows={3}
              className="form-control"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
            {error && <p className="error">{error}</p>}
            <div className="personal-actions">
              <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn--outline btn--sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {resource.notes && <p className="resource-note">{resource.notes}</p>}
            <div className="resource-tags">
              {(resource.tags || []).map((tag) => (
                <span key={tag} className="tag-pill">#{tag}</span>
              ))}
            </div>
          </>
        )}
        {!editing && (
          <div className="personal-actions">
            <button className="btn btn--outline btn--sm" onClick={() => onPreview(resource)}>
              Preview
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => onDownload(resource)}>
              Download
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
              Edit details
            </button>
            <button className="btn btn--ghost btn--sm danger" onClick={() => onDelete(resource)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function UploadPanel({
  form,
  setForm,
  selectedTags,
  onToggleTag,
  onResetTags,
  selectedFile,
  onFileChange,
  fileInputRef,
  uploadStatus,
  onSubmit,
  uploading
}) {
  return (
    <div className="resource-panel card">
      <div className="card__header">
        <div>
          <h3>Upload Your Own Resource</h3>
          <p className="muted">Support routines, scripts, sensory planners, calming audio, or checklists.</p>
        </div>
      </div>
      <div className="card__body resource-upload">
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-control"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Morning routine, sensory playlist, email script..."
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Resource type</label>
            <div className="resource-types">
              {RESOURCE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`type-chip ${form.resourceType === type ? 'active' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, resourceType: type }))}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <div className="resource-tags selector">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  className={`tag-pill selectable ${selectedTags.includes(tag.value) ? 'selected' : ''}`}
                  onClick={() => onToggleTag(tag.value)}
                >
                  #{tag.label}
                </button>
              ))}
            </div>
            <input
              className="form-control"
              placeholder="Add more tags (comma separated)"
              value={form.customTags}
              onChange={(e) => setForm((prev) => ({ ...prev, customTags: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea
              rows={3}
              className="form-control"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Example: Use this script after lunch when sensory overwhelm is high."
            />
          </div>
          <div className="form-group">
            <label className="form-label">File *</label>
            <div className="upload-dropzone">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
              {selectedFile ? (
                <p className="muted">
                  <i className="fas fa-file-alt" aria-hidden /> {selectedFile.name} • {formatBytes(selectedFile.size)}
                </p>
              ) : (
                <p className="muted">PDF, PNG/JPG/SVG, DOCX, TXT, MP3/WAV up to 60 MB.</p>
              )}
            </div>
          </div>
          {uploadStatus.error && <div className="error">{uploadStatus.error}</div>}
          {uploadStatus.message && <div className="success">{uploadStatus.message}</div>}
          <div className="form-actions">
            <button className="btn btn--primary" type="submit" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload resource'}
            </button>
            <button
              className="btn btn--outline"
              type="button"
              onClick={() => {
                setForm({ title: '', resourceType: 'Routine', notes: '', customTags: '' })
                onFileChange(null)
                onResetTags()
              }}
            >
              Clear form
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PreviewModal({ preview, onClose, userEmail }) {
  if (!preview) return null
  const titleId = 'resourcePreviewTitle'
  const { resource, kind } = preview
  return (
    <Modal titleId={titleId} onClose={onClose}>
      <div className="modal-header">
        <h3 id={titleId}>{resource.title}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <i className="fas fa-times" aria-hidden />
        </button>
      </div>
      <div className="modal-body resource-preview">
        {kind === 'official' ? (
          <>
            <p className="muted">{resource.sourceOrg}</p>
            <p>{resource.description}</p>
            <div className="resource-tags">
              {(resource.tags || []).map((tag) => (
                <span key={tag} className="tag-pill">#{tag}</span>
              ))}
            </div>
            <div className="resource-preview-actions">
              <a className="btn btn--outline" href={resource.sourceUrl} target="_blank" rel="noreferrer">
                View source
              </a>
              <a className="btn btn--primary" href={resource.downloadUrl} target="_blank" rel="noreferrer">
                Download
              </a>
            </div>
          </>
        ) : (
          <>
            <PreviewRenderer resource={resource} userEmail={userEmail} />
            <div className="resource-preview-actions">
              <button className="btn btn--primary" onClick={() => window.open(composeUrl(resource.downloadUrl, userEmail), '_blank')}>
                Download
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function PreviewRenderer({ resource, userEmail }) {
  const src = composeUrl(resource.previewUrl, userEmail)
  switch (resource.previewType) {
    case 'image':
      return <img src={src} alt={resource.title} className="resource-preview-media" />
    case 'pdf':
      return <iframe title={resource.title} src={src} className="resource-preview-media" />
    case 'audio':
      return (
        <audio controls className="resource-audio">
          <source src={src} />
        </audio>
      )
    case 'text':
      return <iframe title={resource.title} src={src} className="resource-preview-media" />
    case 'document':
      return (
        <div className="resource-preview-message">
          <i className="fas fa-file-word" aria-hidden />
          <p>Preview not available. Download to open this DOCX file.</p>
        </div>
      )
    default:
      return (
        <div className="resource-preview-message">
          <i className="fas fa-file" aria-hidden />
          <p>Preview not available. Download to view this file.</p>
        </div>
      )
  }
}

function composeUrl(path, ownerEmail) {
  if (!path) return ''
  const base = path.startsWith('http://') || path.startsWith('https://') ? path : `${API_BASE}${path}`
  if (!ownerEmail) return base
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}ownerEmail=${encodeURIComponent(ownerEmail)}`
}

function normalizeTags(list) {
  const set = new Set()
  list
    .map((tag) => String(tag || '').trim().toLowerCase())
    .filter(Boolean)
    .forEach((tag) => set.add(tag))
  return Array.from(set)
}

function sortPersonalResources(items) {
  return [...items].sort((a, b) => {
    if (a.starred && !b.starred) return -1
    if (!a.starred && b.starred) return 1
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  })
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

function formatDate(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

function deriveTitle(filename = '') {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}
