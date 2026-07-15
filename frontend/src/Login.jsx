import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, useAuth } from './auth'

// One component for both /login and /signup — `mode` picks the endpoint and copy.
export default function Login({ mode = 'login' }) {
  const signup = mode === 'signup'
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (signup && password !== confirm) return setError('Passwords don’t match.')
    setBusy(true); setError('')
    try {
      const data = await api('/api/auth/' + (signup ? 'signup' : 'login'), {
        method: 'POST', json: { name, email, password },
      })
      signIn(data)
      nav('/app')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">{signup ? 'Create your account' : 'Welcome back'}</p>
        <h1 className="auth-title">{signup ? 'Start improving your resume.' : 'Sign in to continue.'}</h1>

        {signup && (
          <label className="auth-field">
            <span>Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" autoComplete="name" />
          </label>
        )}
        <label className="auth-field">
          <span>Email</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                 placeholder="you@example.com" autoComplete="email" />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <div className="pw-wrap">
            <input type={show ? 'text' : 'password'} required value={password}
                   onChange={e => setPassword(e.target.value)}
                   placeholder={signup ? 'At least 6 characters' : '••••••••'}
                   autoComplete={signup ? 'new-password' : 'current-password'} />
            <button type="button" className="pw-toggle" onClick={() => setShow(s => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </label>
        {signup && (
          <label className="auth-field">
            <span>Confirm password</span>
            <input type={show ? 'text' : 'password'} required value={confirm}
                   onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your password"
                   autoComplete="new-password" />
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>

        <p className="auth-alt">
          {signup
            ? <>Already have an account? <Link to="/login">Sign in</Link></>
            : <>New here? <Link to="/signup">Create an account</Link></>}
        </p>
      </form>
    </div>
  )
}
