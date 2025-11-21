import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export default function HelpRequestsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = async () => {
    setLoading(true); setError(null)
    try { const data = await api.listHelpRequests(); setItems(data||[]) } catch(e) { setError(e) } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  return (
    <section className="content-section active">
      <div className="section-header">
        <h2>Help Requests</h2>
        <button className="btn btn--outline btn--sm" onClick={refresh} disabled={loading}>{loading? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <div className="card">
        <div className="card__header"><h3>Latest</h3></div>
        <div className="card__body">
          {error && <div className="deadline-empty" style={{color:'var(--color-error)'}}>{error.message}</div>}
          {(!items || items.length===0) && !loading && <div className="deadline-empty">No help requests yet</div>}
          {(items||[]).map(r => (
            <div key={r.id} className="deadline-row" style={{display:'grid', gridTemplateColumns:'140px 1fr 100px', gap:12, alignItems:'center'}}>
              <span className="badge" style={{textTransform:'capitalize'}}>{r.type}</span>
              <span className="deadline-title" style={{whiteSpace:'pre-wrap'}}>{r.description}</span>
              <span className={`urgency-pill ${r.urgency==='high'?'urgent': r.urgency==='medium'?'medium':'low'}`}>{r.urgency}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

