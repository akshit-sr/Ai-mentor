import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './auth'
import { Report } from './Assess'
import { Roadmap } from './MentorChat'

const GRADE_COLOR = { A: '#1F8A54', B: '#5C8A1F', C: '#C0761B', D: '#C0392B' }
const SITUATION = { student: '🎓 Student', working: '💼 Working', unemployed: '🔍 Between jobs' }

export default function History() {
  const [items, setItems] = useState(null)
  const [maps, setMaps] = useState(null)
  const [open, setOpen] = useState(null)     // `a${id}` | `r${id}`
  const [compare, setCompare] = useState([]) // up to 2 analysis ids
  const [reRole, setReRole] = useState({})   // analysisId -> role input
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setError('')
    Promise.all([api('/api/analyses'), api('/api/roadmaps')])
      .then(([a, r]) => { setItems(a); setMaps(r) })
      .catch(e => setError(e.message))
  }
  useEffect(load, [])

  async function del(kind, id) {
    if (!confirm('Delete this permanently?')) return
    try {
      await api(`/api/${kind}/${id}`, { method: 'DELETE' })
      load()
    } catch (e) { setError('Delete failed: ' + e.message) }
  }

  async function reassess(id) {
    const role = (reRole[id] || '').trim()
    if (!role) return
    setBusy(true); setError('')
    try {
      await api('/api/reassess', { method: 'POST', json: { analysisId: id, role } })
      setReRole(s => ({ ...s, [id]: '' }))
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  function toggleCompare(id) {
    setCompare(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id].slice(-2))
  }

  if (error && !items) return <div className="hist"><p className="error">Couldn’t load your history: {error}</p></div>
  if (!items || !maps) return (
    <div className="hist">
      <p className="eyebrow">Your history</p>
      <h1 className="hist-title">Past assessments</h1>
      {[0, 1, 2].map(i => <div key={i} className="skeleton" />)}
    </div>
  )

  const selected = compare.map(id => items.find(a => a.id === id)).filter(Boolean)

  return (
    <div className="hist">
      <p className="eyebrow">Your history</p>
      <h1 className="hist-title">Past assessments</h1>
      {error && <p className="error">{error}</p>}

      {selected.length === 2 && (
        <div className="compare">
          <div className="compare-head">
            <h2>Comparing two assessments</h2>
            <button className="nav-logout" onClick={() => setCompare([])}>Clear</button>
          </div>
          <div className="compare-grid">
            {selected.map(a => <div key={a.id}><Report result={JSON.parse(a.resultJson)} /></div>)}
          </div>
        </div>
      )}

      {items.length === 0
        ? <p className="empty">No assessments yet. <Link to="/app">Grade your first resume →</Link></p>
        : <ul className="hist-list">
            {items.map(a => (
              <li key={a.id} className="hist-item">
                <div className="hist-row">
                  <input type="checkbox" className="hist-cmp" title="Select to compare"
                         checked={compare.includes(a.id)} onChange={() => toggleCompare(a.id)} />
                  <button className="hist-open" onClick={() => setOpen(open === 'a' + a.id ? null : 'a' + a.id)}>
                    <span className="hist-grade" style={{ background: GRADE_COLOR[a.grade] || '#6B7280' }}>{a.grade}</span>
                    <span className="hist-meta">
                      <b>{a.targetRole}</b>
                      <small>{a.fileName} · {new Date(a.createdAt).toLocaleString()}</small>
                    </span>
                    <span className="hist-match">{Math.round(a.matchPct)}% match</span>
                    <span className="hist-chev">{open === 'a' + a.id ? '▲' : '▼'}</span>
                  </button>
                  <button className="hist-del" onClick={() => del('analyses', a.id)} title="Delete">✕</button>
                </div>
                {open === 'a' + a.id && (
                  <div className="hist-body">
                    <div className="reassess">
                      <span>Re-grade this resume for another role:</span>
                      <input value={reRole[a.id] || ''} placeholder="e.g. Data Scientist"
                             onChange={e => setReRole(s => ({ ...s, [a.id]: e.target.value }))}
                             onKeyDown={e => e.key === 'Enter' && reassess(a.id)} />
                      <button disabled={busy} onClick={() => reassess(a.id)}>{busy ? '…' : 'Re-assess'}</button>
                    </div>
                    <Report result={JSON.parse(a.resultJson)} />
                  </div>
                )}
              </li>
            ))}
          </ul>}

      {maps.length > 0 && <>
        <h2 className="hist-title" style={{ marginTop: 40 }}>Saved roadmaps</h2>
        <ul className="hist-list">
          {maps.map(m => (
            <li key={m.id} className="hist-item">
              <div className="hist-row">
                <button className="hist-open" onClick={() => setOpen(open === 'r' + m.id ? null : 'r' + m.id)}>
                  <span className="hist-grade" style={{ background: 'var(--accent)', fontSize: '1rem' }}>◆</span>
                  <span className="hist-meta">
                    <b>{m.role}</b>
                    <small>{SITUATION[m.situation] || m.situation}{m.hours ? ` · ${m.hours} hrs/wk` : ''} · {new Date(m.createdAt).toLocaleString()}</small>
                  </span>
                  <span className="hist-chev">{open === 'r' + m.id ? '▲' : '▼'}</span>
                </button>
                <button className="hist-del" onClick={() => del('roadmaps', m.id)} title="Delete">✕</button>
              </div>
              {open === 'r' + m.id && <RoadmapItem map={m} />}
            </li>
          ))}
        </ul>
      </>}
    </div>
  )
}

// Roadmap with persisted phase completion.
function RoadmapItem({ map }) {
  const [done, setDone] = useState(() => {
    try { return JSON.parse(map.completedPhases || '[]') } catch { return [] }
  })

  function toggle(i) {
    const next = done.includes(i) ? done.filter(x => x !== i) : [...done, i]
    setDone(next)
    api(`/api/roadmaps/${map.id}/progress`, { method: 'PATCH', json: { completed: next } }).catch(() => {})
  }

  return (
    <div className="hist-roadmap">
      <Roadmap data={JSON.parse(map.roadmapJson)} completed={done} onToggle={toggle} />
    </div>
  )
}
