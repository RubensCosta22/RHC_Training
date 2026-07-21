import { Activity, ArrowLeft, ArrowUpRight, BarChart3, Camera, Dumbbell, Flame, History, Play, Scale, Trophy, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import SectionTitle from '../components/ui/SectionTitle'
import StatCard from '../components/ui/StatCard'
import { getFamilyContext } from '../services/familyService'
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
  const [isAdmin,setIsAdmin]=useState(false)
  useEffect(()=>{getProfile(profileId).then(async p=>{const [s,t,a,context]=await Promise.all([getDashboardSummary(profileId),getAvailablePlanTypes(p),getTodaySchedule(profileId),getFamilyContext()]);setProfile(p);setSummary(s);setTypes(t);setSchedule(a);setIsAdmin(context?.role==='admin')}).catch(e=>setError(friendlyError(e)))},[profileId])
  const next=useMemo(()=>schedule.configured?schedule.workoutType:getNextWorkoutType(summary?.lastWorkout?.workout_type,types),[summary,types,schedule])
  if(error)return <Card className="border-[#FF453A]/30 bg-[#FF453A]/5 text-[#FF9F95]">{error}</Card>
  if(!profile||!summary)return <p className="animate-pulse text-[#8E8E93]">Preparando seu treino...</p>
  const target=profile.name==='Nicole'?3:5; const percent=Math.min(100,Math.round(summary.weekCount/target*100))

  return <div className="pb-8">
    {isAdmin&&<Link to="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8E8E93] transition hover:text-[#F5F5F7]"><ArrowLeft size={17}/> Voltar para perfis</Link>}
    <PageHeader eyebrow="Hoje" title={`Ola, ${profile.name}.`} subtitle={next?'Seu proximo treino esta pronto.':'Hoje o progresso acontece na recuperacao.'} action={<Link to={isAdmin?'/admin':'/profiles'} className="grid h-11 w-11 overflow-hidden place-items-center rounded-full border border-[#2A2A2E] bg-[#141416] text-[#8E8E93] transition hover:border-[#C8FF3D]/40 hover:text-[#F5F5F7]" aria-label={isAdmin?'Voltar para perfis':'Trocar perfil'}>{profile.avatarSignedUrl?<img src={profile.avatarSignedUrl} alt={profile.name} className="h-full w-full object-cover"/>:<UserRound size={19}/>}</Link>}/>

    <div className="lg:grid lg:grid-cols-12 lg:gap-6">
      <section className="mb-10 border-y border-[#2A2A2E] py-9 lg:col-span-8 lg:mb-0 lg:min-h-[390px] lg:border lg:bg-[#141416] lg:p-10 xl:p-12">
        <div className="flex h-full max-w-2xl flex-col justify-center">
          <div className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#C8FF3D]"><span className="h-1.5 w-1.5 rounded-full bg-[#C8FF3D]"/>{next?'Treino de hoje':'Dia de descanso'}</div>
          <h2 className="text-[clamp(3.2rem,6vw,6rem)] font-[780] leading-[.9] tracking-[-.07em] text-[#F5F5F7]">{next?`Treino ${next}`:'Recupere.'}</h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#8E8E93]">{next?(descriptions[next]||'Plano personalizado'):'Sono, nutricao e descanso tambem constroem resultado.'}</p>
          {next&&<Link to={`/workout/${profileId}/${next}`} className="btn-primary mt-9 inline-flex w-fit items-center gap-3 px-6"><Play size={18} fill="currentColor"/> Comecar agora</Link>}
        </div>
      </section>

      <aside className="mb-12 space-y-6 lg:col-span-4 lg:mb-0">
        <section className="border border-[#C8FF3D] bg-[#C8FF3D] p-6 text-[#0A0A0B]">
          <div className="flex items-start justify-between gap-5">
            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] opacity-60">Ritmo semanal</p><p className="mt-2 text-2xl font-[720] tracking-[-.04em]">{summary.weekCount} de {target} sessoes</p></div>
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#0A0A0B] p-1" style={{background:`conic-gradient(#0A0A0B ${percent}%,rgba(10,10,11,.16) 0)`}}><div className="grid h-full w-full place-items-center rounded-full bg-[#C8FF3D]"><span className="tabular-nums text-xl font-black">{percent}%</span></div></div>
          </div>
          <div className="mt-8 h-1 overflow-hidden bg-[#0A0A0B]/15"><div className="h-full bg-[#0A0A0B] transition-all duration-700" style={{width:`${percent}%`}}/></div><p className="mt-3 text-xs opacity-55">Ultima atividade: {summary.lastWorkout?.date||'nenhuma'}</p>
        </section>
        <section className="grid grid-cols-2 gap-x-5 border border-[#2A2A2E] bg-[#141416] px-5">
          <StatCard title="Volume" value={`${Math.round(summary.totalVolume)} kg`} subtitle="total" icon={Dumbbell}/>
          <StatCard title="Peso" value={summary.lastMeasurement?.weight?`${summary.lastMeasurement.weight} kg`:'—'} subtitle={summary.lastMeasurement?.date||'sem registro'} icon={Scale}/>
          <StatCard title="Sequencia" value={summary.currentStreak} subtitle="dias" icon={Flame}/>
          <StatCard title="Recorde" value={summary.bestStreak} subtitle="dias" icon={Trophy}/>
        </section>
      </aside>

      <section className="mt-2 lg:col-span-8 lg:mt-8">
        <SectionTitle eyebrow="Rotina" title="Escolha seu treino" subtitle="A agenda sugere um caminho. Voce mantem o controle."/>
        <div className="grid gap-px overflow-hidden border border-[#2A2A2E] bg-[#2A2A2E] sm:grid-cols-3 lg:grid-cols-5">{types.map(type=><Link key={type} to={`/workout/${profileId}/${type}`} className={`group flex min-h-[104px] items-center justify-between px-4 py-4 transition ${type===next?'bg-[#C8FF3D] text-[#0A0A0B]':'bg-[#141416] text-[#8E8E93] hover:bg-[#1C1C1F] hover:text-[#F5F5F7]'}`}><span><span className="block text-[10px] font-semibold uppercase tracking-wider opacity-60">Treino</span><span className="text-2xl font-black">{type}</span></span><ArrowUpRight size={17} className="opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>)}</div>
      </section>

      <section className="lg:col-span-4 lg:mt-8"><SectionTitle title="Seu espaco"/><div className="overflow-hidden border-y border-[#2A2A2E]">{quickLinks.map(({label,detail,path,icon:Icon})=><Link key={path} to={`/${path}/${profileId}`} className="rhc-row group flex items-center gap-4 py-4"><Icon size={19} className="text-[#8E8E93]"/><div className="flex-1"><p className="font-semibold text-[#F5F5F7]">{label}</p><p className="text-xs text-[#8E8E93]">{detail}</p></div><ArrowUpRight size={17} className="text-[#8E8E93] transition group-hover:text-[#C8FF3D]"/></Link>)}</div></section>
    </div>
  </div>
}
