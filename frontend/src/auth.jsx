import { createContext, useContext, useState } from 'react'

const KEY = 'mentor_auth'
const AuthCtx = createContext(null)

// Dev: empty (Vite proxies /api -> :8080). Prod: VITE_API_URL, falling back to the Render backend.
const PROD_API = 'https://ai-mentor-backend-x12k.onrender.com'
const BASE = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : PROD_API)).replace(/\/$/, '')

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(load) // { token, email, name } | null

  const signIn = (data) => { localStorage.setItem(KEY, JSON.stringify(data)); setUser(data) }
  const signOut = async () => {
    try { await fetch(BASE + '/api/auth/logout', { method: 'POST', headers: authHeader() }) } catch { /* ignore */ }
    localStorage.removeItem(KEY); setUser(null)
  }

  return <AuthCtx.Provider value={{ user, signIn, signOut }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

function authHeader() {
  const u = load()
  return u?.token ? { Authorization: 'Bearer ' + u.token } : {}
}

// fetch wrapper that attaches the token and surfaces server error text.
export async function api(path, { method = 'GET', body, json } = {}) {
  const headers = { ...authHeader() }
  if (json) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + path, { method, headers, body: json ? JSON.stringify(json) : body })
  // 401 on a normal call = expired session -> bounce to login. But on the auth
  // endpoints a 401 is just "wrong credentials", so let it surface as an error.
  if (res.status === 401 && !path.startsWith('/api/auth/')) { localStorage.removeItem(KEY); location.href = '/login' }
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try { msg = JSON.parse(text).message || text } catch { /* not JSON */ }
    throw new Error(msg || res.statusText)
  }
  // Empty body (e.g. void DELETE/PATCH -> 200 with no content) must not go through res.json().
  const text = await res.text()
  return text ? JSON.parse(text) : null
}
