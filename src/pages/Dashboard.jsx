import { Activity, ArrowUpRight, BarChart3, Camera, Dumbbell, Flame, History, Play, Scale, Trophy, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import SectionTitle from '../components/ui/SectionTitle'
import StatCard from '../components/ui/StatCard'
import { getProfile } from '../services/profileService'
import { getAvailablePlanTypes } from '../services/planService'
import { getDashboardSummary } from '../services/workoutService'
import { getTodaySchedule } from '../services/scheduleService'
import { friendlyError } from '../utils/validation'
import { getNextWorkoutType } from '../utils/workoutRotation'

const descriptions = { A:'Peito • Ombro • Triceps', B:'Costas • Biceps', C:'Pernas • Core', D:'Forca funcional • Posterior', E:'Condicionamento • Corrida' }
const quickLinks = [
  {label:'Historico',detail:'Treinos salvos',path:'history',icon:History},
  {label:'Evolucao',detail:'Graficos e cargas',path:'progress',icon:BarChart3},
  {label:'Medidas',detail:'Peso e corpo',path:'measurements',icon:Activity},
  {label:'Fotos',detail:'Evolucao visual',path:'photos',icon:Camera}
]

export default function Dashboard() {
  const { profileId } = useParams()
  const [profile,setProfile]=useState(null); const [summary,setSummary]=useState(null)
  const [types,setTypes]=useState(['A','B','C']); const [schedule,setSchedule]=useState({configured:false,workoutType:null}); const [error,setError]=useState('')
  useEffect(()=>{getProfile(profileId).then(async p=>{const [s,t,a]=await Promise.all([getDashboardSummary(profileId),getAvailablePlanTypes(p),getTodaySchedule(profileId)]);setProfile(p);setSummary(s);setTypes(t);setSchedule(a)}).catch(e=>setError(friendlyError(e)))},[profileId])
  const next=useMemo(()=>schedule.configured?schedule.workoutType:getNextWorkoutType(summary?.lastWorkout?.workout_type,types),[summary,types,schedule])
  if(error)return <Card className="border-[#ff6b70]/30 bg-[#ff6b70]/5 text-[#ffb0b3]">{error}</Card>
  if(!profile||!summary)return <p className="animate-pulse text-[#62676f]">Preparando seu treino...</p>
  const target=profile.name==='Nicole'?3:5; const percent=Math.min(100,Math.round(summary.weekCount/target*100))

  return <div>
    <PageHeader eyebrow="Hoje" title={`Ola, ${profile.name}.`} subtitle={next?'Seu proximo treino esta pronto.':'Hoje o progresso acontece na recuperacao.'} action={<Link to="/profiles" className="grid h-11 w-11 place-items-center rounded-full border border-[#272a2f] text-[#92979f] transition hover:bg-[#141619] hover:text-white" aria-label="Trocar perfil"><UserRound size={19}/></Link>}/>

    <section className="relative mb-12 overflow-hidden border-y border-[#272a2f] py-8 sm:py-10">
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[13rem] font-black leading-none tracking-[-.08em] text-white/[.025]">{next||'R'}</div>
      <div className="relative max-w-2xl">
        <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#c8ff3d]"><span className="h-1.5 w-1.5 rounded-full bg-[#c8ff3d]"/>{next?'Treino de hoje':'Dia de descanso'}</div>
        <h2 className="rhc-display">{next?`Treino ${next}`:'Recupere.'}</h2>
        <p className="mt-4 text-base text-[#92979f]">{next?(descriptions[next]||'Plano personalizado'):'Sono, nutricao e descanso tambem constroem resultado.'}</p>
        {next&&<Link to={`/workout/${profileId}/${next}`} className="btn-primary mt-8 inline-flex items-center gap-3 px-6"><Play size={18} fill="currentColor"/> Comecar agora</Link>}
      </div>
    </section>

    <section className="mb-12 grid gap-8 sm:grid-cols-[1.35fr_.65fr] sm:items-end">
      <div><div className="mb-4 flex items-end justify-between"><div><p className="rhc-kicker mb-2">Ritmo semanal</p><p className="text-2xl font-[680] tracking-[-.035em]">{summary.weekCount} de {target} sessoes</p></div><p className="tabular-nums text-3xl font-[730] text-[#c8ff3d]">{percent}%</p></div><ProgressBar value={percent}/><p className="mt-3 text-xs text-[#62676f]">Ultima atividade: {summary.lastWorkout?.date||'nenhum treino registrado'}</p></div>
      <div className="border-l border-[#272a2f] pl-6"><p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#62676f]">Consistencia</p><div className="mt-2 flex items-baseline gap-2"><Flame size={20} className="text-[#ffb55e]"/><span className="tabular-nums text-4xl font-[730]">{summary.currentStreak}</span><span className="text-sm text-[#62676f]">dias</span></div></div>
    </section>

    <section className="mb-12 grid grid-cols-2 gap-x-6 sm:grid-cols-4">
      <StatCard title="Volume total" value={`${Math.round(summary.totalVolume)} kg`} subtitle="levantado" icon={Dumbbell}/>
      <StatCard title="Peso atual" value={summary.lastMeasurement?.weight?`${summary.lastMeasurement.weight} kg`:'—'} subtitle={summary.lastMeasurement?.date||'sem registro'} icon={Scale}/>
      <StatCard title="Sequencia" value={summary.currentStreak} subtitle="dias" icon={Flame}/>
      <StatCard title="Recorde" value={summary.bestStreak} subtitle="dias seguidos" icon={Trophy}/>
    </section>

    <SectionTitle eyebrow="Rotina" title="Escolha seu treino" subtitle="A agenda sugere um caminho. Voce mantem o controle."/>
    <section className="mb-12 flex gap-2 overflow-x-auto pb-2">{types.map(type=><Link key={type} to={`/workout/${profileId}/${type}`} className={`group flex min-w-[112px] flex-1 items-center justify-between rounded-2xl border px-4 py-4 transition ${type===next?'border-[#c8ff3d] bg-[#c8ff3d] text-[#111400]':'border-[#272a2f] bg-[#0d0f11] text-[#92979f] hover:bg-[#141619] hover:text-white'}`}><span><span className="block text-[10px] font-semibold uppercase tracking-wider opacity-60">Treino</span><span className="text-2xl font-black">{type}</span></span><ArrowUpRight size={17} className="opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>)}</section>

    <SectionTitle title="Seu espaco"/>
    <section className="overflow-hidden border-y border-[#272a2f]">{quickLinks.map(({label,detail,path,icon:Icon})=><Link key={path} to={`/${path}/${profileId}`} className="rhc-row group flex items-center gap-4 py-4"><Icon size={19} className="text-[#62676f]"/><div className="flex-1"><p className="font-semibold text-[#f5f7f2]">{label}</p><p className="text-xs text-[#62676f]">{detail}</p></div><ArrowUpRight size={17} className="text-[#62676f] transition group-hover:text-[#c8ff3d]"/></Link>)}</section>
  </div>
}
