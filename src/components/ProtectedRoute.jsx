import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Carregando sessão...</div>
  }

  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
