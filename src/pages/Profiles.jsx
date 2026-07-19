import { LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingCard from '../components/ui/LoadingCard'
import PageHeader from '../components/ui/PageHeader'
import ProfileCard from '../components/ProfileCard'
import { supabase } from '../lib/supabaseClient'
import { getProfilesWithLastWorkout } from '../services/profileService'
import { getFamilyContext } from '../services/familyService'
import { logEvent } from '../services/telemetryService'
import { friendlyError } from '../utils/validation'

export default function Profiles() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getFamilyContext().then((context) => {
      if (context?.role === 'admin') { navigate('/admin', { replace: true }); return null }
      return getProfilesWithLastWorkout()
    })
      .then((items) => { if (items) setProfiles(items) })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false))
  }, [navigate])

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <PageHeader
        eyebrow="RHC Training"
        title="Escolha o perfil"
        subtitle="Selecione quem vai treinar agora."
        action={
          <button
            onClick={logout}
            className="rounded-2xl bg-slate-900 p-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="Sair"
            type="button"
          >
            <LogOut size={22} />
          </button>
        }
      />

      {loading && <LoadingCard lines={4} />}

      {error && (
        <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onSelect={async () => {
                await logEvent(
                  'profile_selected',
                  { profile_name: profile.name },
                  profile.id
                )
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
