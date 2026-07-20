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

  return <div className="pb-6">
    <PageHeader eyebrow="Hoje" title={`Ola, ${profile.name}.`} subtitle={next?'Seu proximo treino esta pronto.':'Hoje o progresso acontece na recuperacao.'} action={<Link to="/profiles" className="grid h-11 w-11 place-items-center rounded-full border border-[#272a2f] text-[#92979f] transition hover:bg-[#141619] hover:text-white" aria-label="Trocar perfil"><UserRound size={19}/></Link>}/>

    <div className="lg:grid lg:grid-cols-12 lg:gap-6">
      <section className="relative mb-10 overflow-hidden border-y border-[#272a2f] py-9 lg:col-span-8 lg:mb-0 lg:min-h-[410px] lg:rounded-[28px] lg:border lg:bg-[#101214] lg:p-10 xl:p-12">
        <div className="absolute -right-14 -top-20 h-72 w-72 rounded-full border border-white/[.035] lg:h-[430px] lg:w-[430px]"/><div className="absolute -right-4 top-12 h-52 w-52 rounded-full border border-[#c8ff3d]/10 lg:h-72 lg:w-72"/>
        <div className="relative z-10 flex h-full max-w-xl flex-col justify-center">
          <div className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#c8ff3d]"><span className="h-1.5 w-1.5 rounded-full bg-[#c8ff3d]"/>{next?'Treino de hoje':'Dia de descanso'}</div>
          <h2 className="text-[clamp(3.2rem,6vw,6rem)] font-[780] leading-[.9] tracking-[-.07em]">{next?`Treino ${next}`:'Recupere.'}</h2>
          <p className="mt-5 text-base text-[#92979f]">{next?(descriptions[next]||'Plano personalizado'):'Sono, nutricao e descanso tambem constroem resultado.'}</p>
          {next&&<Link to={`/workout/${profileId}/${next}`} className="btn-primary mt-9 inline-flex w-fit items-center gap-3 px-6"><Play size={18} fill="currentColor"/> Comecar agora</Link>}
        </div>
        <span className="pointer-events-none absolute bottom-[-.16em] right-8 hidden text-[15rem] font-[800] leading-none tracking-[-.09em] text-white/[.025] lg:block">{next||'R'}</span>
      </section>

      <aside className="mb-12 space-y-6 lg:col-span-4 lg:mb-0">
        <section className="rounded-[24px] bg-[#c8ff3d] p-6 text-[#111400] lg:min-h-[220px]">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] opacity-60">Ritmo semanal</p><p className="mt-2 text-2xl font-[720] tracking-[-.04em]">{summary.weekCount} de {target} sessoes</p></div><div className="grid h-20 w-20 place-items-center rounded-full bg-[#111400] p-1" style={{background:`conic-gradient(#111400 ${percent}%,rgba(17,20,0,.16) 0)`}}><div className="grid h-full w-full place-items-center rounded-full bg-[#c8ff3d]"><span className="tabular-nums text-xl font-black">{percent}%</span></div></div></div>
          <div className="mt-8 h-1 overflow-hidden rounded-full bg-[#111400]/15"><div className="h-full bg-[#111400] transition-all duration-700" style={{width:`${percent}%`}}/></div><p className="mt-3 text-xs opacity-55">Ultima atividade: {summary.lastWorkout?.date||'nenhuma'}</p>
        </section>
        <section className="grid grid-cols-2 gap-x-5 rounded-[24px] border border-[#272a2f] bg-[#0d0f11] px-5">
          <StatCard title="Volume" value={`${Math.round(summary.totalVolume)} kg`} subtitle="total" icon={Dumbbell}/>
          <StatCard title="Peso" value={summary.lastMeasurement?.weight?`${summary.lastMeasurement.weight} kg`:'—'} subtitle={summary.lastMeasurement?.date||'sem registro'} icon={Scale}/>
          <StatCard title="Sequencia" value={summary.currentStreak} subtitle="dias" icon={Flame}/>
          <StatCard title="Recorde" value={summary.bestStreak} subtitle="dias" icon={Trophy}/>
        </section>
      </aside>

      <section className="mt-2 lg:col-span-8 lg:mt-8">
        <SectionTitle eyebrow="Rotina" title="Escolha seu treino" subtitle="A agenda sugere um caminho. Voce mantem o controle."/>
        <div className="flex gap-2 overflow-x-auto pb-2">{types.map(type=><Link key={type} to={`/workout/${profileId}/${type}`} className={`group flex min-w-[112px] flex-1 items-center justify-between rounded-2xl border px-4 py-4 transition ${type===next?'border-[#c8ff3d] bg-[#c8ff3d] text-[#111400]':'border-[#272a2f] bg-[#0d0f11] text-[#92979f] hover:bg-[#141619] hover:text-white'}`}><span><span className="block text-[10px] font-semibold uppercase tracking-wider opacity-60">Treino</span><span className="text-2xl font-black">{type}</span></span><ArrowUpRight size={17} className="opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>)}</div>
      </section>

      <section className="lg:col-span-4 lg:mt-8"><SectionTitle title="Seu espaco"/><div className="overflow-hidden border-y border-[#272a2f]">{quickLinks.map(({label,detail,path,icon:Icon})=><Link key={path} to={`/${path}/${profileId}`} className="rhc-row group flex items-center gap-4 py-4"><Icon size={19} className="text-[#62676f]"/><div className="flex-1"><p className="font-semibold text-[#f5f7f2]">{label}</p><p className="text-xs text-[#62676f]">{detail}</p></div><ArrowUpRight size={17} className="text-[#62676f] transition group-hover:text-[#c8ff3d]"/></Link>)}</div></section>
    </div>
  </div>
}
