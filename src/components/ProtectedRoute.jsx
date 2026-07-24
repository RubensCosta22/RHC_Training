import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { logger, createRequestId } from '../lib/observability/logger'
import { secureSignOut } from '../services/authService'

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart']

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        logger.warn('auth.protected_session_lookup_failed', {
          requestId: createRequestId(),
          error
        })
      }
      setSession(data?.session || null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return undefined

    let timer
    const scheduleLogout = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(async () => {
        logger.info('auth.inactivity_timeout', {
          requestId: createRequestId(),
          userId: session.user?.id
        })
        try {
          await secureSignOut()
        } catch (error) {
          logger.warn('auth.inactivity_signout_failed', {
            requestId: createRequestId(),
            userId: session.user?.id,
            error
          })
        } finally {
          setSession(null)
        }
      }, INACTIVITY_TIMEOUT_MS)
    }

    const handleActivity = () => scheduleLogout()
    const handleVisibility = () => {
      if (!document.hidden) scheduleLogout()
    }

    scheduleLogout()
    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }))
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [session])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Carregando sessão...</div>
  }

  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
