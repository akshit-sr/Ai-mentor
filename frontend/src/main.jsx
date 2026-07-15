import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './App.css'
import { AuthProvider, useAuth } from './auth'
import Layout from './Layout'
import Landing from './Landing'
import Login from './Login'
import Assess from './Assess'
import History from './History'

function Protected({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login mode="login" />} />
            <Route path="signup" element={<Login mode="signup" />} />
            <Route path="app" element={<Protected><Assess /></Protected>} />
            <Route path="history" element={<Protected><History /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
