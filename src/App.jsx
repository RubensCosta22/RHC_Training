import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Login from './pages/Login'
import Measurements from './pages/Measurements'
import Photos from './pages/Photos'
import Profiles from './pages/Profiles'
import Progress from './pages/Progress'
import Settings from './pages/Settings'
import Workout from './pages/Workout'
import { syncPendingWorkouts } from './services/workoutService'

function AppShell({ children }) {
  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28">
      <TopBar />
      {children}
      <BottomNav />
    </main>
  )
}

export default function App() {
  useEffect(() => {
    const runSync = () => syncPendingWorkouts().catch(() => undefined)
    runSync()
    window.addEventListener('online', runSync)
    return () => window.removeEventListener('online', runSync)
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profiles" element={<AppShell><Profiles /></AppShell>} />
        <Route path="/dashboard/:profileId" element={<AppShell><Dashboard /></AppShell>} />
        <Route path="/workout/:profileId/:type" element={<AppShell><Workout /></AppShell>} />
        <Route path="/history/:profileId" element={<AppShell><History /></AppShell>} />
        <Route path="/progress/:profileId" element={<AppShell><Progress /></AppShell>} />
        <Route path="/measurements/:profileId" element={<AppShell><Measurements /></AppShell>} />
        <Route path="/photos/:profileId" element={<AppShell><Photos /></AppShell>} />
        <Route path="/settings/:profileId" element={<AppShell><Settings /></AppShell>} />
      </Route>
      <Route path="*" element={<Navigate to="/profiles" replace />} />
    </Routes>
  )
}
