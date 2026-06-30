import { LogOut, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileCard from '../components/ProfileCard'
import { supabase } from '../lib/supabaseClient'
import { getProfilesWithLastWorkout } from '../services/profileService'
import { friendlyError } from '../utils/validation'

export default function Profiles() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getProfilesWithLastWorkout()
      .then(setProfiles)
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false))
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-emerald-300">TotalPass casal</p>
          <h1 className="text-3xl font-black">Escolha o perfil</h1>
        </div>
        <button onClick={logout} className="rounded-2xl bg-slate-900 p-3 text-slate-300" aria-label="Sair">
          <LogOut size={22} />
        </button>
      </header>

      {loading && <p className="text-slate-400">Preparando perfis...</p>}
      {error && <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}

      <div className="grid gap-4">
        {profiles.map((profile) => <ProfileCard key={profile.id} profile={profile} />)}
      </div>

      <section className="card mt-5 flex gap-3 text-sm text-slate-300">
        <Users className="text-emerald-300" />
        <p>O progresso fica salvo na nuvem por login. Entrando em outro celular com a mesma conta, os dados são carregados novamente.</p>
      </section>
    </div>
  )
}
