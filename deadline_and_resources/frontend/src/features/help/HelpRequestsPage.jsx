import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

export default function HelpRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = await api.listHelpRequests()
        setRequests(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="content-section"><p>Loading help requests...</p></div>
  if (error) return <div className="content-section"><p>Failed to load help requests.</p></div>

  return (
    <section className="content-section">
      <div className="section-header">
        <h2>Help Requests</h2>
        <p>Here are the help requests submitted from the app.</p>
      </div>
      {requests.length === 0 ? (
        <p>No help requests yet.</p>
      ) : (
        <div className="card">
          <div className="card__body">
            {requests.map((r) => (
              <div key={r.id} className="help-request-row">
                <div>
                  <strong>{r.type}</strong>{' '}
                  <span style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>
                    ({r.urgency || 'low'})
                  </span>
                  <div style={{ fontSize: '0.9rem', marginTop: 4 }}>
                    {r.description || '(no description)'}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString()
                    : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
