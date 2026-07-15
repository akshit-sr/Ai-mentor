import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'

export default function Layout() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()

  async function logout() {
    await signOut()
    nav('/')
  }

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/" className="brand">◆ Career Mentor</Link>
        <div className="nav-links">
          {user ? (
            <>
              <NavLink to="/app">Assess</NavLink>
              <NavLink to="/history">History</NavLink>
              <span className="nav-user">{user.name || user.email}</span>
              <button className="nav-logout" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <Link to="/signup" className="nav-cta">Sign up</Link>
            </>
          )}
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
