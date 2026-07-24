import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppErrorBoundary from './components/AppErrorBoundary'
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import TopBar from './components/TopBar'
import { logger, createRequestId } from './lib/observability/logger'
import { syncPendingWorkouts } from './services/workoutService'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Archived = lazy(() => import('./pages/Archived'))
const Admin = lazy(() => import('./pages/Admin'))
const History = lazy(() => import('./pages/History'))
const Login = lazy(() => import('./pages/Login'))
const Measurements = lazy(() => import('./pages/Measurements'))
const Photos = lazy(() => import('./pages/Photos'))
const Plans = lazy(() => import('./pages/Plans'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Family = lazy(() => import('./pages/Family'))
const Profiles = lazy(() => import('./pages/Profiles'))
const Progress = lazy(() => import('./pages/Progress'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
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
  const { pathname } = useLocation()
  const wide = ['/admin', '/family', '/plans', '/schedule'].includes(pathname)
  const profileArea = /^\/(dashboard|workout|history|progress|measurements|photos|settings|archived)\//.test(pathname)
  return (
    <main className={`mx-auto min-h-screen max-w-[1440px] px-5 pb-32 sm:px-8 ${profileArea?'lg:pl-[244px] lg:pr-10':'lg:px-12'} ${wide?'2xl:max-w-[1560px]':''}`}>
      <TopBar />
      <div className="page-enter">{children}</div>
      <BottomNav />
    </main>
  )
}

export default function App() {
  useEffect(() => {
    const syncRequestId = createRequestId()
    const runSync = () => syncPendingWorkouts().catch((error) => {
      logger.error('offline_sync.failed', {
        requestId: syncRequestId,
        error
      })
    })

    const handleWindowError = (event) => {
      logger.fatal('application.unhandled_error', {
        requestId: createRequestId(),
        error: event.error || new Error(event.message || 'Unhandled window error'),
        source: event.filename || undefined,
        line: event.lineno || undefined,
        column: event.colno || undefined
      })
    }

    const handleUnhandledRejection = (event) => {
      logger.fatal('application.unhandled_promise_rejection', {
        requestId: createRequestId(),
        error: event.reason instanceof Error ? event.reason : new Error('Unhandled promise rejection')
      })
    }

    runSync()
    window.addEventListener('online', runSync)
    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('online', runSync)
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <AppErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/profiles" element={<AppShell><Profiles /></AppShell>} />
            <Route path="/admin" element={<AppShell><Admin /></AppShell>} />
            <Route path="/family" element={<AppShell><Family /></AppShell>} />
            <Route path="/plans" element={<AppShell><Plans /></AppShell>} />
            <Route path="/schedule" element={<AppShell><Schedule /></AppShell>} />
            <Route path="/dashboard/:profileId" element={<AppShell><Dashboard /></AppShell>} />
            <Route path="/workout/:profileId/:type" element={<AppShell><Workout /></AppShell>} />
            <Route path="/history/:profileId" element={<AppShell><History /></AppShell>} />
            <Route path="/progress/:profileId" element={<AppShell><Progress /></AppShell>} />
            <Route path="/measurements/:profileId" element={<AppShell><Measurements /></AppShell>} />
            <Route path="/photos/:profileId" element={<AppShell><Photos /></AppShell>} />
            <Route path="/settings/:profileId" element={<AppShell><Settings /></AppShell>} />
            <Route path="/archived/:profileId" element={<AppShell><Archived /></AppShell>} />
          </Route>
          <Route path="*" element={<Navigate to="/profiles" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  )
}
