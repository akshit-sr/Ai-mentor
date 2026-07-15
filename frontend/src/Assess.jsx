import { useEffect, useRef, useState } from 'react'
import MentorChat from './MentorChat'
import { api } from './auth'

const GRADE_COLOR = { A: '#1F8A54', B: '#5C8A1F', C: '#C0761B', D: '#C0392B' }
const GOOD = '#1F8A54', OK = '#C0761B', BAD = '#C0392B'

// Raw feature numbers -> labeled, color-coded, human-readable meters.
function qualityMetrics(f) {
  const pick = (v, good, ok) => (v >= good ? GOOD : v >= ok ? OK : BAD)
  const verbs = f.action_verb_ratio * 100
  const sections = Math.round(f.section_coverage * 4)
  return [
    { label: 'Skills detected', value: f.skill_count, pct: Math.min(f.skill_count / 12 * 100, 100),
      color: pick(f.skill_count, 8, 4),
      hint: f.skill_count >= 8 ? 'Great breadth of skills.' : 'List more relevant technologies.' },
    { label: 'Length', value: `${f.word_count} words`, pct: Math.min(f.word_count / 700 * 100, 100),
      color: f.word_count >= 400 && f.word_count <= 900 ? GOOD : OK,
      hint: f.word_count < 400 ? 'A bit short — add more detail.'
        : f.word_count > 900 ? 'A little long — tighten it up.' : 'Good length for one page.' },
    { label: 'Action verbs', value: `${verbs.toFixed(1)}%`, pct: Math.min(verbs / 5 * 100, 100),
      color: pick(verbs, 3, 1.5),
      hint: verbs >= 3 ? 'Strong, active phrasing.' : 'Open bullets with verbs: built, led, improved.' },
    { label: 'Quantified impact', value: f.has_numbers ? 'Yes' : 'No', pct: f.has_numbers ? 100 : 15,
      color: f.has_numbers ? GOOD : BAD,
      hint: f.has_numbers ? 'You back results with numbers.' : 'Add metrics, e.g. "cut load time 40%".' },
    { label: 'Sections found', value: `${sections} / 4`, pct: sections / 4 * 100,
      color: pick(sections, 4, 2), hint: 'Experience · Education · Skills · Projects.' },
  ]
}

// The signature element: a progress ring (role match) around the letter grade.
function Medallion({ grade, score }) {
  const R = 74, C = 2 * Math.PI * R
  const color = GRADE_COLOR[grade] || '#6B7280'
  return (
    <svg className="medallion" viewBox="0 0 180 180" role="img"
         aria-label={`Grade ${grade}, score ${score} of 100`}>
      <circle cx="90" cy="90" r={R} className="ring-track" />
      <circle cx="90" cy="90" r={R} className="ring-fill" stroke={color}
              strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} />
      <text x="90" y="86" className="med-grade" fill={color}>{grade}</text>
      <text x="90" y="112" className="med-score">{score}/100</text>
    </svg>
  )
}

export function Report({ result, showActions }) {
  return (
    <section className="report">
      {showActions && (
        <div className="report-actions">
          <button type="button" className="pdf-btn" onClick={() => window.print()}>⬇ Download PDF</button>
        </div>
      )}
      <div className="report-head">
        <Medallion grade={result.grade.grade} score={result.grade.score} />
        <div>
          <p className="eyebrow">Assessed for</p>
          <h2>{result.gap.role}</h2>
          <p className="matchline">
            <strong style={{ color: GRADE_COLOR[result.grade.grade] }}>{result.gap.match_pct}%</strong>
            {' '}role match · Grade <strong>{result.grade.grade}</strong>
          </p>
        </div>
      </div>

      <div className="cols">
        <div className="col">
          <h3><span className="tick">✓</span> Strengths you can lead with</h3>
          <ul className="chips have">{result.gap.matched.map(s => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="col">
          <h3><span className="cross">→</span> Gaps to close</h3>
          {result.gap.missing.length
            ? <ul className="gaps">
                {result.gap.missing.map(s => {
                  const r = result.gap.resources?.[s] || {}
                  const courses = r.courses || []
                  const search = r.search || []
                  return (
                  <li key={s} className="gap">
                    <span className="gap-name">{s}</span>
                    {courses.length > 0 && (
                      <ul className="courses">
                        {courses.map(c => (
                          <li key={c.url}>
                            <a href={c.url} target="_blank" rel="noreferrer" className="course-link">{c.title}</a>
                            <span className={'src ' + c.type}>{c.source} · {c.type}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="gap-learn">{courses.length ? 'More:' : 'Learn:'}{' '}
                      {search.map(x => (
                        <a key={x.label} href={x.url} target="_blank" rel="noreferrer"
                           className={'res ' + x.type}>{x.label}</a>
                      ))}
                    </span>
                  </li>
                )})}
              </ul>
            : <p className="allclear">You cover every required skill for this role.</p>}
        </div>
      </div>

      <h3 className="section-label">Resume quality</h3>
      <div className="metrics">
        {qualityMetrics(result.features).map(m => (
          <div className="metric" key={m.label}>
            <div className="metric-top">
              <span>{m.label}</span>
              <span className="metric-val" style={{ color: m.color }}>{m.value}</span>
            </div>
            <div className="meter"><div style={{ width: m.pct + '%', background: m.color }} /></div>
            <p className="metric-hint">{m.hint}</p>
          </div>
        ))}
      </div>

      <p className="detected"><span>Detected skills</span> {result.skills_detected.join(' · ') || '—'}</p>
    </section>
  )
}

export default function Assess() {
  const [suggestions, setSuggestions] = useState({})
  const [role, setRole] = useState('')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const resultRef = useRef(null)

  useEffect(() => {
    api('/api/roles').then(setSuggestions).catch(() => {})
  }, [])

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [result])

  async function analyze(e) {
    e.preventDefault()
    if (!file) return setError('Choose a resume file first.')
    if (!role.trim()) return setError('Type the role you’re targeting.')
    setLoading(true); setError(''); setResult(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('target_role', role.trim())
      setResult(await api('/api/analyze', { method: 'POST', body }))
    } catch (err) {
      setError('Analysis failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="hero">
        <p className="eyebrow">Resume assessment</p>
        <h1>Grade your resume<br /><em>against any role.</em></h1>
        <p className="lede">
          Upload your resume, name the role you want, and get a marked report:
          an overall grade, how well you match the role, and exactly which skills to close the gap.
        </p>

        <form onSubmit={analyze} className="panel">
          <div className="field">
            <label htmlFor="role">Target role</label>
            <input id="role" list="role-suggestions" value={role} autoComplete="off"
                   placeholder="e.g. Machine Learning Engineer, Product Designer…"
                   onChange={e => setRole(e.target.value)} />
            <datalist id="role-suggestions">
              {Object.values(suggestions).map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="file">Resume file</label>
            <label className="filepick">
              <input id="file" type="file" accept=".pdf,.txt"
                     onChange={e => setFile(e.target.files[0])} />
              <span>{file ? file.name : 'Choose PDF or .txt…'}</span>
            </label>
          </div>
          <button disabled={loading}>{loading ? 'Assessing…' : 'Assess resume'}</button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
        {loading && (
          <div className="working" role="status">
            <span className="spinner" aria-hidden="true" />
            <span>Reading your resume and mapping it to the role…</span>
          </div>
        )}
      </header>

      {result && <div ref={resultRef}><Report result={result} showActions /></div>}
      {result && <MentorChat key={result.gap.role} role={result.gap.role} missing={result.gap.missing} />}
    </>
  )
}
