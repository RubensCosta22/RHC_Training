import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import TopBar from './components/TopBar'
import { syncPendingWorkouts } from './services/workoutService'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const History = lazy(() => import('./pages/History'))
const Login = lazy(() => import('./pages/Login'))
const Measurements = lazy(() => import('./pages/Measurements'))
const Photos = lazy(() => import('./pages/Photos'))
const Profiles = lazy(() => import('./pages/Profiles'))
const Progress = lazy(() => import('./pages/Progress'))
const Settings = lazy(() => import('./pages/Settings'))
const Workout = lazy(() => import('./pages/Workout'))

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-300">
      Carregando...
    </div>
  )
}

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
    <Suspense fallback={<PageFallback />}>
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
    </Suspense>
  )
}
