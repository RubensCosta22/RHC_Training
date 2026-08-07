import { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { getFamilyContext } from '../services/familyService'
import { supabase } from '../lib/supabaseClient'
import { logger, createRequestId } from '../lib/observability/logger'

export default function ProfileRouteGuard() {
  const { profileId } = useParams()
  const [state, setState] = useState({ loading: true, allowed: false, redirect: null, error: '' })

  useEffect(() => {
    let active = true

    async function validateProfileRoute() {
      const requestId = createRequestId()
      try {
        const context = await getFamilyContext()
        if (!active) return

        if (context?.role === 'admin') {
          setState({ loading: false, allowed: true, redirect: null, error: '' })
          return
        }

        // RLS is still the server-side authority. The client additionally fails
        // closed when a regular account can see zero or multiple profiles.
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .order('id')
          .limit(2)

        if (error) throw error
        if (!active) return

        const profiles = data || []
        if (profiles.length === 0) {
          logger.warn('auth.profile_route_no_profile', { requestId, profileId })
          setState({ loading: false, allowed: false, redirect: null, error: 'Nenhum perfil foi associado a esta conta. O acesso foi bloqueado por segurança.' })
          return
        }

        if (profiles.length > 1) {
          logger.error('auth.profile_route_ambiguous_access', {
            requestId,
            profileId,
            accessibleProfileCount: profiles.length
          })
          setState({ loading: false, allowed: false, redirect: null, error: 'Mais de um perfil está associado a esta conta. O acesso foi bloqueado por segurança.' })
          return
        }

        const authorizedProfileId = profiles[0].id
        if (authorizedProfileId !== profileId) {
          logger.warn('auth.profile_route_mismatch_blocked', {
            requestId,
            requestedProfileId: profileId,
            authorizedProfileId
          })
          setState({ loading: false, allowed: false, redirect: `/dashboard/${authorizedProfileId}`, error: '' })
          return
        }

        setState({ loading: false, allowed: true, redirect: null, error: '' })
      } catch (error) {
        if (!active) return
        logger.error('auth.profile_route_validation_failed', { requestId, profileId, error })
        setState({ loading: false, allowed: false, redirect: null, error: 'Não foi possível validar o perfil desta sessão. O acesso foi bloqueado por segurança.' })
      }
    }

    validateProfileRoute()
    return () => { active = false }
  }, [profileId])

  if (state.loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-slate-300">Validando perfil...</div>
  }

  if (state.redirect) return <Navigate to={state.redirect} replace />

  if (!state.allowed) {
    return (
      <div className="mx-auto mt-12 max-w-xl border border-[#FF453A]/30 bg-[#FF453A]/5 p-5 text-sm text-[#FF9F95]">
        {state.error}
      </div>
    )
  }

  return <Outlet />
}
