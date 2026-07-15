import { useEffect, useRef, useState } from 'react'
import { api } from './auth'

const SITUATIONS = [
  { label: '🎓  Student', value: 'student' },
  { label: '💼  Working professional', value: 'working' },
  { label: '🔍  Between jobs', value: 'unemployed' },
]
const HOURS = [
  { label: 'Under 5 hrs / week', value: 4 },
  { label: '5–10 hrs / week', value: 8 },
  { label: '10+ hrs / week', value: 14 },
]

export function Roadmap({ data, completed, onToggle }) {
  const done = new Set(completed || [])
  const phases = data.phases || []
  const track = onToggle && phases.length > 0
  return (
    <div className="roadmap">
      {data.summary && <p className="rm-summary">{data.summary}</p>}
      {track && (
        <div className="rm-progress">
          <div className="rm-bar"><div style={{ width: (done.size / phases.length * 100) + '%' }} /></div>
          <span>{done.size} / {phases.length} phases done</span>
        </div>
      )}
      <ol className="rm-phases">
        {phases.map((p, i) => (
          <li key={i} className={'rm-phase' + (done.has(i) ? ' is-done' : '')}>
            <div className="rm-head">
              <span className="rm-title">
                {onToggle && (
                  <input type="checkbox" className="rm-check" checked={done.has(i)}
                         onChange={() => onToggle(i)} aria-label={`Mark ${p.title} done`} />
                )}
                {p.title}
              </span>
              {p.duration && <span className="rm-dur">{p.duration}</span>}
            </div>
            {p.focus && <p className="rm-focus">{p.focus}</p>}
            {p.skills?.length > 0 && (
              <div className="rm-skills">{p.skills.map(s => <span key={s}>{s}</span>)}</div>
            )}
            {p.milestone && <p className="rm-milestone"><b>Milestone:</b> {p.milestone}</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function MentorChat({ role, missing }) {
  const [msgs, setMsgs] = useState([
    { from: 'bot', text: `Let's turn those gaps into a real plan for ${role}. First — where are you right now?` },
  ])
  const [step, setStep] = useState('situation') // situation | hours | generating | done
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [msgs])

  const say = (from, payload) => setMsgs(m => [...m, { from, ...payload }])

  function pickSituation(s) {
    say('user', { text: SITUATIONS.find(x => x.value === s).label })
    if (s === 'working') {
      setStep('hours')
      say('bot', { text: 'Makes sense. How much time can you realistically commit each week?' })
    } else {
      say('bot', { text: s === 'unemployed'
        ? 'Right — let’s treat this like a full-time push and get you job-ready.'
        : 'Perfect — here’s a plan you can keep up alongside your studies.' })
      generate(s, s === 'unemployed' ? 40 : 10)
    }
  }

  function pickHours(h) {
    say('user', { text: HOURS.find(x => x.value === h).label })
    generate('working', h)
  }

  async function generate(situation, hours) {
    setStep('generating')
    say('bot', { typing: true })
    try {
      const data = await api('/api/roadmap', { method: 'POST', json: { role, missing, situation, hours } })
      setMsgs(m => [...m.filter(x => !x.typing), { from: 'bot', roadmap: data }])
    } catch (e) {
      setMsgs(m => [...m.filter(x => !x.typing),
        { from: 'bot', text: 'I couldn’t build the roadmap — is the local role model running? ' + e.message }])
    }
    setStep('done')
  }

  return (
    <section className="chat">
      <div className="chat-head"><span className="dot" /> Mentor</div>
      <div className="chat-body">
        {msgs.map((m, i) => (
          <div key={i} className={'bubble ' + m.from}>
            {m.typing ? <span className="typing"><i /><i /><i /></span>
              : m.roadmap ? <Roadmap data={m.roadmap} />
              : m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {step === 'situation' && (
        <div className="replies">
          {SITUATIONS.map(s => <button key={s.value} onClick={() => pickSituation(s.value)}>{s.label}</button>)}
        </div>
      )}
      {step === 'hours' && (
        <div className="replies">
          {HOURS.map(h => <button key={h.value} onClick={() => pickHours(h.value)}>{h.label}</button>)}
        </div>
      )}
    </section>
  )
}
