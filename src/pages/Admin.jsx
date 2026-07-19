import { ArrowRight, CalendarDays, Dumbbell, LogOut, Plus, Settings2, ShieldCheck, Sparkles, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { supabase } from '../lib/supabaseClient'
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

  async function logout() { await supabase.auth.signOut(); navigate('/login', { replace: true }) }
  async function createProfile(event) {
    event.preventDefault(); setMessage(''); setCreating(true)
    try { await createFamilyProfile(newProfile); await loadProfiles(); setNewProfile(initialProfile); setShowCreate(false); setMessage('Perfil criado e convite associado com sucesso.') }
    catch (err) { setMessage(friendlyError(err)) } finally { setCreating(false) }
  }

  return <div>
    <PageHeader eyebrow="Painel administrativo" title="Visao da familia" subtitle="Acompanhe os perfis e gerencie os treinos em um unico lugar." action={<button onClick={logout} type="button" aria-label="Sair" className="rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-300 hover:border-red-400/50 hover:text-red-300"><LogOut size={20}/></button>} />

    <section className="card-glow mb-5 overflow-hidden p-5 sm:p-6">
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><span className="badge-success inline-flex items-center gap-2"><ShieldCheck size={14}/> Acesso administrativo</span><h2 className="mt-3 text-2xl font-black">Tudo pronto para cuidar da rotina</h2><p className="mt-1 max-w-xl text-sm text-slate-400">As alteracoes de planos afetam somente os proximos treinos. O historico permanece protegido.</p></div>
        <Link to="/plans" className="btn-primary flex shrink-0 items-center justify-center gap-2"><Sparkles size={18}/> Gerenciar planos</Link>
      </div>
    </section>

    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="card"><UsersRound className="mb-3 text-emerald-300"/><p className="text-3xl font-black">{profiles.length}</p><p className="text-xs text-slate-400">Perfis supervisionados</p></div>
      <div className="card"><Dumbbell className="mb-3 text-lime-300"/><p className="text-3xl font-black">{trainedProfiles}</p><p className="text-xs text-slate-400">Com historico de treino</p></div>
      <div className="card col-span-2 sm:col-span-1"><CalendarDays className="mb-3 text-sky-300"/><p className="text-lg font-black">Agenda semanal</p><p className="text-xs text-slate-400">Treinos e descansos organizados</p></div>
    </div>

    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <Link to="/family" className="group card flex items-center gap-4 transition hover:border-emerald-400/40"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><UsersRound/></span><div className="flex-1"><strong>Grupo familiar</strong><p className="text-sm text-slate-400">Titulares, convites e acessos</p></div><ArrowRight className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-300"/></Link>
      <Link to="/plans" className="group card flex items-center gap-4 transition hover:border-emerald-400/40"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-400/10 text-lime-300"><Settings2/></span><div className="flex-1"><strong>Planos de treino</strong><p className="text-sm text-slate-400">Exercicios e cronogramas</p></div><ArrowRight className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-300"/></Link>
    </div>

    <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Perfis supervisionados</h2><p className="text-sm text-slate-400">Consulte rapidamente a atividade de cada pessoa.</p></div><button className="btn-secondary flex items-center gap-2 px-4" onClick={()=>setShowCreate((value)=>!value)}>{showCreate?<X size={18}/>:<Plus size={18}/>}<span className="hidden sm:inline">{showCreate?'Cancelar':'Novo perfil'}</span></button></div>

    {showCreate && <form className="card-glow mb-5 grid gap-3 sm:grid-cols-2" onSubmit={createProfile}>
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
    <div className="grid gap-3 sm:grid-cols-2">{profiles.map((profile)=><Link to={`/dashboard/${profile.id}`} className="group card flex items-center gap-4 transition hover:border-emerald-400/40" key={profile.id}><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-lime-300 text-2xl font-black text-slate-950">{profile.avatar_url||profile.name?.[0]}</span><div className="min-w-0 flex-1"><h3 className="truncate text-lg font-black">{profile.name}</h3><p className="truncate text-sm text-slate-400">{profile.goal}</p><p className="mt-1 text-xs text-slate-500">{profile.lastWorkout?`Ultimo treino ${profile.lastWorkout.workout_type} em ${profile.lastWorkout.date}`:'Sem treino registrado'}</p></div><ArrowRight className="shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-300"/></Link>)}</div>
    {!loading&&!error&&!profiles.length&&<section className="card text-center"><Dumbbell className="mx-auto mb-2 text-slate-400"/><p>Nenhum perfil associado.</p></section>}
  </div>
}
