import { Link } from 'react-router-dom'
import { useAuth } from './auth'

export default function Landing() {
  const { user } = useAuth()
  return (
    <header className="hero landing">
      <p className="eyebrow">AI Career Mentor</p>
      <h1>Know exactly how your resume<br /><em>stacks up.</em></h1>
      <p className="lede">
        Upload your resume, name any role, and get a graded report — your match score,
        the skills you’re missing, hand-picked courses to close each gap, and a personal
        upskilling roadmap. All running on your own machine.
      </p>
      <div className="cta-row">
        {user
          ? <Link className="cta" to="/app">Open your dashboard</Link>
          : <>
              <Link className="cta" to="/signup">Get started — it’s free</Link>
              <Link className="cta ghost" to="/login">I already have an account</Link>
            </>}
      </div>

      <div className="feature-grid">
        <div className="feat"><b>Graded assessment</b><span>A letter grade and role-match score from a resume-quality model.</span></div>
        <div className="feat"><b>Skill-gap analysis</b><span>See the exact skills a role needs that your resume is missing.</span></div>
        <div className="feat"><b>Curated learning</b><span>Free and paid courses fetched for every gap — no fluff.</span></div>
        <div className="feat"><b>Personal roadmap</b><span>A mentor chat tailors a plan to your situation and free time.</span></div>
      </div>
    </header>
  )
}
