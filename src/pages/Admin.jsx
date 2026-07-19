import { Dumbbell, Settings2, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import ProfileCard from '../components/ProfileCard'
import { getFamilyContext } from '../services/familyService'
import { getProfilesWithLastWorkout } from '../services/profileService'
import { friendlyError } from '../utils/validation'

export default function Admin() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFamilyContext().then(async (context) => {
      if (context?.role !== 'admin') { navigate('/profiles', { replace: true }); return }
      setProfiles(await getProfilesWithLastWorkout())
    }).catch((err) => setError(friendlyError(err))).finally(() => setLoading(false))
  }, [navigate])

  return <div>
    <PageHeader eyebrow="RHC Training" title="Administracao" subtitle="Gerencie a familia e consulte os perfis sem entrar no fluxo de treino." />
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      <Link to="/family" className="card flex items-center gap-3"><UsersRound className="text-emerald-300"/><div><strong>Grupo familiar</strong><p className="text-sm text-slate-400">Associar titulares e revisar acessos</p></div></Link>
      <Link to="/plans" className="card flex items-center gap-3"><Settings2 className="text-emerald-300"/><div><strong>Planos de treino</strong><p className="text-sm text-slate-400">Editar treinos A, B, C, D e E</p></div></Link>
    </div>
    <section className="mb-4 flex items-center gap-3"><ShieldCheck className="text-lime-300"/><div><h2 className="text-xl font-black">Perfis supervisionados</h2><p className="text-sm text-slate-400">Abra um perfil somente quando quiser consultar seus dados.</p></div></section>
    {loading && <section className="card">Carregando perfis...</section>}
    {error && <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
    <div className="grid gap-4">{profiles.map((profile)=><ProfileCard key={profile.id} profile={profile}/>)}</div>
    {!loading && !error && !profiles.length && <section className="card text-center"><Dumbbell className="mx-auto mb-2 text-slate-400"/><p>Nenhum perfil associado.</p></section>}
  </div>
}
