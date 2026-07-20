import { ArrowUpRight, CalendarDays, Dumbbell, LogOut, Plus, Settings2, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { secureSignOut } from '../services/authService'
import { getFamilyContext } from '../services/familyService'
import { getProfilesWithLastWorkout } from '../services/profileService'
import { createFamilyProfile } from '../services/scheduleService'
import { friendlyError } from '../utils/validation'

const initialProfile = { name: '', age: 25, gender: 'mulher', goal: '', email: '' }

export default function Admin() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newProfile, setNewProfile] = useState(initialProfile)
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)

  async function loadProfiles() { setProfiles(await getProfilesWithLastWorkout()) }

  useEffect(() => {
    getFamilyContext().then(async (context) => {
      if (context?.role !== 'admin') { navigate('/profiles', { replace: true }); return }
      await loadProfiles()
    }).catch((err) => setError(friendlyError(err))).finally(() => setLoading(false))
  }, [navigate])

  const trainedProfiles = useMemo(() => profiles.filter((profile) => profile.lastWorkout).length, [profiles])

  async function logout() { await secureSignOut(); navigate('/login', { replace: true }) }
  async function createProfile(event) {
    event.preventDefault(); setMessage(''); setCreating(true)
    try { await createFamilyProfile(newProfile); await loadProfiles(); setNewProfile(initialProfile); setShowCreate(false); setMessage('Perfil criado e convite associado com sucesso.') }
    catch (err) { setMessage(friendlyError(err)) } finally { setCreating(false) }
  }

  return <div>
    <PageHeader eyebrow="Administracao familiar" title="Central RHC" subtitle="Pessoas, rotinas e acesso. Sem interferir no historico de treino." action={<button onClick={logout} type="button" aria-label="Sair" className="grid h-11 w-11 place-items-center rounded-full border border-[#272a2f] text-[#92979f] transition hover:border-[#ff6b70]/40 hover:text-[#ff6b70]"><LogOut size={18}/></button>} />

    <section className="mb-14 grid gap-8 border-y border-[#272a2f] py-8 sm:grid-cols-[1fr_auto] sm:items-end">
      <div><p className="rhc-kicker mb-3">Visao geral</p><div className="flex items-baseline gap-4"><span className="tabular-nums text-7xl font-[760] tracking-[-.065em]">{profiles.length}</span><span className="max-w-32 text-sm leading-snug text-[#62676f]">perfis sob sua supervisao</span></div></div>
      <div className="flex gap-8 sm:text-right"><div><p className="tabular-nums text-2xl font-bold">{trainedProfiles}</p><p className="text-xs text-[#62676f]">com atividade</p></div><div><p className="tabular-nums text-2xl font-bold">{Math.max(0,profiles.length-trainedProfiles)}</p><p className="text-xs text-[#62676f]">sem atividade</p></div></div>
    </section>

    <section className="mb-14 grid gap-px overflow-hidden rounded-[18px] bg-[#272a2f] sm:grid-cols-3">
      {[{to:'/family',icon:UsersRound,title:'Pessoas e acesso',text:'Titulares, convites e permissoes'},{to:'/plans',icon:Settings2,title:'Planos de treino',text:'Exercicios e configuracoes'},{to:'/schedule',icon:CalendarDays,title:'Agenda semanal',text:'Treinos e descansos por dia'}].map(({to,icon:Icon,title,text})=><Link to={to} key={to} className="group bg-[#0d0f11] p-5 transition hover:bg-[#141619]"><div className="mb-8 flex items-start justify-between"><Icon size={20} className="text-[#92979f]"/><ArrowUpRight size={17} className="text-[#62676f] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#c8ff3d]"/></div><strong className="block text-lg">{title}</strong><p className="mt-1 text-sm text-[#62676f]">{text}</p></Link>)}
    </section>

    <div className="mb-5 flex items-end justify-between gap-3 border-b border-[#272a2f] pb-4"><div><p className="rhc-kicker mb-2">Equipe</p><h2 className="text-2xl font-[700] tracking-[-.04em]">Perfis supervisionados</h2></div><button className="btn-secondary flex items-center gap-2 px-4" onClick={()=>setShowCreate((value)=>!value)}>{showCreate?<X size={17}/>:<Plus size={17}/>}<span className="hidden sm:inline">{showCreate?'Cancelar':'Novo perfil'}</span></button></div>

    {showCreate && <form className="mb-8 grid gap-4 border-b border-[#272a2f] bg-[#0d0f11] p-5 sm:grid-cols-2" onSubmit={createProfile}>
      <div className="sm:col-span-2"><h3 className="text-lg font-black">Adicionar perfil familiar</h3><p className="text-sm text-slate-400">O titular recebera acesso ao entrar com o e-mail associado.</p></div>
      <label className="text-sm text-slate-300">Nome<input required value={newProfile.name} onChange={(e)=>setNewProfile({...newProfile,name:e.target.value})}/></label>
      <label className="text-sm text-slate-300">Idade<input required min="1" max="120" type="number" value={newProfile.age} onChange={(e)=>setNewProfile({...newProfile,age:e.target.value})}/></label>
      <label className="text-sm text-slate-300">Genero<select value={newProfile.gender} onChange={(e)=>setNewProfile({...newProfile,gender:e.target.value})}><option value="mulher">Mulher</option><option value="homem">Homem</option><option value="outro">Outro</option></select></label>
      <label className="text-sm text-slate-300">E-mail titular<input required type="email" value={newProfile.email} onChange={(e)=>setNewProfile({...newProfile,email:e.target.value})}/></label>
      <label className="text-sm text-slate-300 sm:col-span-2">Objetivo<input required value={newProfile.goal} onChange={(e)=>setNewProfile({...newProfile,goal:e.target.value})}/></label>
      <button disabled={creating} className="btn-primary sm:col-span-2">{creating?'Criando perfil...':'Criar e associar perfil'}</button>
    </form>}

    {message&&<p className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p>}
    {loading&&<section className="card">Carregando perfis...</section>}
    {error&&<p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
    <div className="overflow-hidden border-y border-[#272a2f]">{profiles.map((profile)=><Link to={`/dashboard/${profile.id}`} className="rhc-row group flex items-center gap-4 py-4" key={profile.id}>{profile.avatarSignedUrl?<img src={profile.avatarSignedUrl} alt={profile.name} className="h-11 w-11 shrink-0 rounded-full object-cover"/>:<span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1a1d21] text-sm font-black text-[#c8ff3d]">{profile.name?.[0]}</span>}<div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{profile.name}</h3><p className="truncate text-sm text-[#62676f]">{profile.goal}</p></div><p className="hidden text-xs text-[#62676f] sm:block">{profile.lastWorkout?`Treino ${profile.lastWorkout.workout_type} · ${profile.lastWorkout.date}`:'Sem atividade'}</p><ArrowUpRight size={17} className="shrink-0 text-[#62676f] transition group-hover:text-[#c8ff3d]"/></Link>)}</div>
    {!loading&&!error&&!profiles.length&&<section className="card text-center"><Dumbbell className="mx-auto mb-2 text-slate-400"/><p>Nenhum perfil associado.</p></section>}
  </div>
}
