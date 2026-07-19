import { Dumbbell, Settings2, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import ProfileCard from '../components/ProfileCard'
import { getFamilyContext } from '../services/familyService'
import { getProfilesWithLastWorkout } from '../services/profileService'
import { friendlyError } from '../utils/validation'
import { createFamilyProfile } from '../services/scheduleService'

export default function Admin() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [newProfile,setNewProfile]=useState({name:'Karol',age:25,gender:'mulher',goal:'Ganho de massa muscular',email:''})
  const [message,setMessage]=useState('')

  useEffect(() => {
    getFamilyContext().then(async (context) => {
      if (context?.role !== 'admin') { navigate('/profiles', { replace: true }); return }
      setProfiles(await getProfilesWithLastWorkout())
    }).catch((err) => setError(friendlyError(err))).finally(() => setLoading(false))
  }, [navigate])

  async function createProfile(event){event.preventDefault();setMessage('');try{await createFamilyProfile(newProfile);setMessage('Perfil criado e convite associado. Atualize a pagina para visualizar.')}catch(error){setMessage(friendlyError(error))}}

  return <div>
    <PageHeader eyebrow="RHC Training" title="Administracao" subtitle="Gerencie a familia e consulte os perfis sem entrar no fluxo de treino." />
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      <Link to="/family" className="card flex items-center gap-3"><UsersRound className="text-emerald-300"/><div><strong>Grupo familiar</strong><p className="text-sm text-slate-400">Associar titulares e revisar acessos</p></div></Link>
      <Link to="/plans" className="card flex items-center gap-3"><Settings2 className="text-emerald-300"/><div><strong>Planos de treino</strong><p className="text-sm text-slate-400">Editar treinos A, B, C, D e E</p></div></Link>
    </div>
    <form className="card mb-5 grid gap-3 sm:grid-cols-2" onSubmit={createProfile}>
      <h2 className="text-xl font-black sm:col-span-2">Adicionar perfil familiar</h2>
      <label className="text-sm">Nome<input value={newProfile.name} onChange={(e)=>setNewProfile({...newProfile,name:e.target.value})}/></label>
      <label className="text-sm">Idade<input type="number" value={newProfile.age} onChange={(e)=>setNewProfile({...newProfile,age:e.target.value})}/></label>
      <label className="text-sm">Genero<select value={newProfile.gender} onChange={(e)=>setNewProfile({...newProfile,gender:e.target.value})}><option value="mulher">Mulher</option><option value="homem">Homem</option><option value="outro">Outro</option></select></label>
      <label className="text-sm">E-mail titular<input type="email" value={newProfile.email} onChange={(e)=>setNewProfile({...newProfile,email:e.target.value})}/></label>
      <label className="text-sm sm:col-span-2">Objetivo<input value={newProfile.goal} onChange={(e)=>setNewProfile({...newProfile,goal:e.target.value})}/></label>
      <button className="btn-primary sm:col-span-2">Criar perfil</button>
      {message&&<p className="text-sm text-emerald-200 sm:col-span-2">{message}</p>}
    </form>
    <section className="mb-4 flex items-center gap-3"><ShieldCheck className="text-lime-300"/><div><h2 className="text-xl font-black">Perfis supervisionados</h2><p className="text-sm text-slate-400">Abra um perfil somente quando quiser consultar seus dados.</p></div></section>
    {loading && <section className="card">Carregando perfis...</section>}
    {error && <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
    <div className="grid gap-4">{profiles.map((profile)=><ProfileCard key={profile.id} profile={profile}/>)}</div>
    {!loading && !error && !profiles.length && <section className="card text-center"><Dumbbell className="mx-auto mb-2 text-slate-400"/><p>Nenhum perfil associado.</p></section>}
  </div>
}
