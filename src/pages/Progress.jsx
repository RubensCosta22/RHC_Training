import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { Activity, ArrowUpRight, ChevronDown, ChevronUp, Dumbbell, Flame, Target, Trophy } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import ProgramPerformancePanel from '../components/ProgramPerformancePanel'
import { getStatsCenter } from '../services/statsService'
import { getProgramStats } from '../services/programStatsService'
import { friendlyError } from '../utils/validation'

const formatNumber = (value) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(value || 0))
const tooltip = {
  contentStyle: { background: '#141416', border: '1px solid #2A2A2E', borderRadius: 8, color: '#F5F5F7' },
  labelStyle: { color: '#8E8E93' },
  cursor: { fill: 'rgba(200,255,61,.04)' }
}

function Delta({ value, label = 'vs. período anterior' }) {
  const positive = value >= 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? 'text-[#C8FF3D]' : 'text-amber-300'}`}>
      <ArrowUpRight className={`h-3.5 w-3.5 ${positive ? '' : 'rotate-90'}`} />
      {positive ? '+' : ''}{value}% <span className="font-normal text-[#8E8E93]">{label}</span>
    </span>
  )
}

function Metric({ label, value, detail, icon: Icon }) {
  return (
    <div className="py-4">
      <div className="flex items-center gap-2 text-[#8E8E93]">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-[#F5F5F7]">{value}</p>
      <p className="mt-1 text-xs text-[#8E8E93]">{detail}</p>
    </div>
  )
}

export default function Progress() {
  const { profileId } = useParams()
  const [stats, setStats] = useState(null)
  const [programStats, setProgramStats] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [period, setPeriod] = useState('semanal')
  const [showMore, setShowMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getStatsCenter(profileId), getProgramStats(profileId)])
      .then(([result, programResult]) => {
        setStats(result)
        setProgramStats(programResult)
        setSelectedExercise(result.raw.exercises[0]?.exercise_name || '')
      })
      .catch((err) => setError(friendlyError(err)))
  }, [profileId])

  const exerciseNames = useMemo(() => stats ? [...new Set(stats.raw.exercises.map((item) => item.exercise_name))] : [], [stats])
  const exerciseWeights = useMemo(() => stats ? stats.raw.exercises.filter((item) => item.exercise_name === selectedExercise) : [], [stats, selectedExercise])
  const selectedRecord = useMemo(() => stats?.rankings.personalRecords.find((item) => item.exerciseName === selectedExercise) || null, [stats, selectedExercise])

  if (error) return <p className="border border-red-400/30 bg-red-400/10 p-3 text-red-100">{error}</p>
  if (!stats) return <p className="text-[#8E8E93]">Carregando estatísticas...</p>
  if (!stats.summary.totalWorkouts) return <><PageHeader eyebrow="Performance" title="Sua evolução começa aqui" subtitle="Conclua o primeiro treino para ativar seu centro de performance." /><EmptyState title="Nenhum treino registrado ainda" description="Seus recordes, tendências e conquistas aparecerão aqui." icon={Dumbbell} /></>

  const { summary, charts, rankings, raw, achievements } = stats
  const trendData = period === 'semanal' ? charts.weeklyVolumeChart : charts.monthlyVolumeChart
  const trendKey = period === 'semanal' ? 'week' : 'month'

  return (
    <div className="page-enter pb-10">
      <PageHeader eyebrow="Evolução" title="Seu progresso." subtitle="O que importa agora, sem distrações." />

      <ProgramPerformancePanel stats={programStats} />

      <section className="mb-10 border-b border-[#2A2A2E] pb-8">
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm text-[#8E8E93]">Esta semana</p>
            <div className="mt-1 flex items-end gap-2">
              <strong className="tabular-nums text-6xl font-semibold leading-none tracking-[-.06em] text-[#F5F5F7]">{summary.weeklyWorkouts}</strong>
              <span className="pb-1 text-base text-[#8E8E93]">treinos</span>
            </div>
            <div className="mt-3"><Delta value={summary.comparisons.weeklyWorkouts} /></div>
            <p className="mt-4 text-sm text-[#8E8E93]">{summary.streak.current > 0 ? `${summary.streak.current} ${summary.streak.current === 1 ? 'semana ativa' : 'semanas ativas'} em sequência.` : 'Um novo treino inicia sua próxima sequência.'}</p>
          </div>

          <div>
            <div className="mb-2 flex items-end justify-between gap-4">
              <div><p className="text-sm text-[#8E8E93]">Volume semanal</p><p className="mt-1 text-2xl font-semibold text-[#F5F5F7]">{formatNumber(summary.weeklyVolume)} kg</p></div>
              <Delta value={summary.comparisons.weeklyVolume} label="volume" />
            </div>
            <div className="h-36 sm:h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={raw.sessions.slice(-14)} margin={{ top: 8, right: 2, left: 2, bottom: 0 }}>
                  <defs><linearGradient id="focusVolume" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C8FF3D" stopOpacity=".22"/><stop offset="1" stopColor="#C8FF3D" stopOpacity="0"/></linearGradient></defs>
                  <Tooltip {...tooltip} formatter={(value) => [`${formatNumber(value)} kg`, 'Volume']} />
                  <Area type="monotone" dataKey="total_volume" stroke="#C8FF3D" strokeWidth={2.5} fill="url(#focusVolume)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-2 divide-x divide-y divide-[#2A2A2E] border-y border-[#2A2A2E] md:grid-cols-4 md:divide-y-0">
        <div className="pr-4"><Metric label="Volume total" value={`${formatNumber(summary.totalVolume)} kg`} detail={`${summary.totalWorkouts} sessões`} icon={Dumbbell} /></div>
        <div className="pl-4 md:px-4"><Metric label="Sequência" value={`${summary.streak.current} sem.`} detail={`melhor: ${summary.streak.best}`} icon={Flame} /></div>
        <div className="pr-4 md:px-4"><Metric label="Duração média" value={`${summary.averageDuration || 0} min`} detail="por treino" icon={Activity} /></div>
        <div className="pl-4"><Metric label="Maior sessão" value={`${formatNumber(summary.biggestWorkout?.total_volume)} kg`} detail={summary.biggestWorkout?.date || 'sem registro'} icon={Trophy} /></div>
      </section>

      <section className="mb-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div><p className="text-sm text-[#8E8E93]">Tendência</p><h2 className="mt-1 text-2xl font-semibold text-[#F5F5F7]">Volume ao longo do tempo</h2></div>
          <div className="flex gap-1 border-b border-[#2A2A2E]">
            {['semanal', 'mensal'].map((item) => <button key={item} type="button" onClick={() => setPeriod(item)} className={`px-3 py-2 text-xs font-semibold capitalize ${period === item ? 'border-b-2 border-[#C8FF3D] text-[#F5F5F7]' : 'text-[#8E8E93]'}`}>{item}</button>)}
          </div>
        </div>
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#2A2A2E" />
              <XAxis dataKey={trendKey} axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }} />
              <Tooltip {...tooltip} formatter={(value) => [`${formatNumber(value)} kg`, 'Volume']} />
              <Bar dataKey="volume" fill="#C8FF3D" radius={[4, 4, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mb-10 border-y border-[#2A2A2E] py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm text-[#8E8E93]">Força</p><h2 className="mt-1 text-2xl font-semibold text-[#F5F5F7]">Evolução por exercício</h2></div>
          <select className="sm:max-w-64" value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)}>{exerciseNames.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        </div>
        {selectedRecord && <div className="mb-4 grid grid-cols-3 divide-x divide-[#2A2A2E] text-sm"><div><p className="text-[#8E8E93]">Inicial</p><p className="mt-1 font-semibold text-[#F5F5F7]">{selectedRecord.firstWeight} kg</p></div><div className="px-4"><p className="text-[#8E8E93]">Atual</p><p className="mt-1 font-semibold text-[#F5F5F7]">{selectedRecord.lastWeight} kg</p></div><div className="pl-4"><p className="text-[#8E8E93]">Recorde</p><p className="mt-1 font-semibold text-[#C8FF3D]">{selectedRecord.maxWeight} kg</p></div></div>}
        <div className="h-52 sm:h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={exerciseWeights} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#2A2A2E"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }}/><Tooltip {...tooltip} formatter={(value) => [`${value} kg`, 'Carga']}/><Line type="monotone" dataKey="weight" stroke="#C8FF3D" strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></div>
      </section>

      <button type="button" onClick={() => setShowMore((current) => !current)} className="flex w-full items-center justify-between border-b border-[#2A2A2E] py-4 text-left text-sm font-semibold text-[#F5F5F7]">
        Mais indicadores
        {showMore ? <ChevronUp size={18} /> : <ChevronDown size={18} className="text-[#8E8E93]" />}
      </button>

      {showMore && (
        <div className="mt-6 space-y-10">
          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-2"><Target size={16} className="text-[#C8FF3D]"/><h3 className="font-semibold text-[#F5F5F7]">Recordes pessoais</h3></div>
              <div className="divide-y divide-[#2A2A2E]">{rankings.personalRecords.slice(0, 6).map((item) => <div key={item.exerciseName} className="flex items-center justify-between gap-4 py-3"><span className="truncate text-sm text-[#F5F5F7]">{item.exerciseName}</span><span className="whitespace-nowrap text-sm font-semibold text-[#C8FF3D]">{item.maxWeight} kg</span></div>)}</div>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-[#F5F5F7]">Conquistas</h3>
              <div className="divide-y divide-[#2A2A2E]">{achievements.map((item) => <div key={item.id} className="py-3"><p className={item.unlocked ? 'text-sm font-semibold text-[#F5F5F7]' : 'text-sm text-[#8E8E93]'}>{item.title}</p><p className="mt-1 text-xs text-[#8E8E93]">{item.description}</p></div>)}</div>
            </div>
          </section>

          <section className="grid gap-8 border-t border-[#2A2A2E] pt-8 lg:grid-cols-2">
            <div><h3 className="mb-4 font-semibold text-[#F5F5F7]">Ritmo da semana</h3><div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={charts.weekdayFrequency}><CartesianGrid vertical={false} stroke="#2A2A2E"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93' }}/><YAxis hide/><Tooltip {...tooltip}/><Bar dataKey="total" name="Treinos" fill="#C8FF3D" radius={[4,4,0,0]} maxBarSize={30}/></BarChart></ResponsiveContainer></div></div>
            <div><h3 className="mb-4 font-semibold text-[#F5F5F7]">Peso corporal</h3>{raw.measurements.length ? <div className="h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={raw.measurements}><CartesianGrid vertical={false} stroke="#2A2A2E"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }}/><YAxis domain={['dataMin - 2','dataMax + 2']} axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }}/><Tooltip {...tooltip}/><Line type="monotone" dataKey="weight" name="Peso" stroke="#F5F5F7" strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></div> : <p className="border-y border-[#2A2A2E] py-8 text-center text-sm text-[#8E8E93]">Registre medidas para visualizar a evolução corporal.</p>}</div>
          </section>
        </div>
      )}
    </div>
  )
}
