import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import {
  Activity, ArrowUpRight, Award, Dumbbell, Flame, Lock,
  Medal, Target, TrendingUp, Trophy, Zap
} from 'lucide-react'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import { getStatsCenter } from '../services/statsService'
import { friendlyError } from '../utils/validation'

const formatNumber = (value) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(value || 0))
const chartTooltip = {
  contentStyle: { background: '#141619', border: '1px solid #272a2f', borderRadius: 12, color: '#f5f7f2' },
  labelStyle: { color: '#92979f' },
  cursor: { fill: 'rgba(200,255,61,.04)' }
}

function Delta({ value, label = 'vs. período anterior' }) {
  const positive = value >= 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${positive ? 'text-[#c8ff3d]' : 'text-[#ffb55e]'}`}>
      <ArrowUpRight className={`h-3.5 w-3.5 ${positive ? '' : 'rotate-90'}`} />
      {positive ? '+' : ''}{value}% <span className="font-medium text-[#62676f]">{label}</span>
    </span>
  )
}

function Metric({ label, value, detail, icon: Icon }) {
  return (
    <div className="border-t border-[#272a2f] py-5">
      <div className="mb-3 flex items-center justify-between text-[#62676f]">
        <span className="text-[10px] font-bold uppercase tracking-[.14em]">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="tabular-nums text-2xl font-[760] tracking-[-.04em] text-[#f5f7f2]">{value}</p>
      <p className="mt-1 text-xs text-[#62676f]">{detail}</p>
    </div>
  )
}

function Achievement({ item, index }) {
  const Icon = [Zap, Medal, Dumbbell, Flame, Trophy][index % 5]
  return (
    <article className={`group relative min-w-[168px] flex-1 overflow-hidden rounded-[18px] border p-4 transition-transform duration-200 hover:-translate-y-1 ${item.unlocked ? 'border-[#3b4229] bg-[linear-gradient(145deg,#1a1e16,#111311)]' : 'border-[#272a2f] bg-[#101214]'}`}>
      <div className={`mb-8 grid h-11 w-11 place-items-center rounded-full border ${item.unlocked ? 'border-[#c8ff3d]/35 bg-[#c8ff3d]/10 text-[#c8ff3d]' : 'border-[#272a2f] text-[#4b5058]'}`}>
        {item.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
      </div>
      <p className={`font-bold ${item.unlocked ? 'text-[#f5f7f2]' : 'text-[#62676f]'}`}>{item.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#62676f]">{item.description}</p>
    </article>
  )
}

export default function Progress() {
  const { profileId } = useParams()
  const [stats, setStats] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [period, setPeriod] = useState('semanal')
  const [error, setError] = useState('')

  useEffect(() => {
    getStatsCenter(profileId).then((result) => {
      setStats(result)
      setSelectedExercise(result.raw.exercises[0]?.exercise_name || '')
    }).catch((err) => setError(friendlyError(err)))
  }, [profileId])

  const exerciseNames = useMemo(() => stats ? [...new Set(stats.raw.exercises.map((item) => item.exercise_name))] : [], [stats])
  const exerciseWeights = useMemo(() => stats ? stats.raw.exercises.filter((item) => item.exercise_name === selectedExercise) : [], [stats, selectedExercise])
  const selectedRecord = useMemo(() => stats?.rankings.personalRecords.find((item) => item.exerciseName === selectedExercise) || null, [stats, selectedExercise])

  if (error) return <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-red-100">{error}</p>
  if (!stats) return <p className="text-[#92979f]">Carregando estatísticas...</p>
  if (!stats.summary.totalWorkouts) return <><PageHeader eyebrow="Performance" title="Sua evolução começa aqui" subtitle="Conclua o primeiro treino para ativar seu centro de performance." /><EmptyState title="Nenhum treino registrado ainda" description="Seus recordes, tendências e conquistas aparecerão aqui." icon={Dumbbell} /></>

  const { summary, charts, rankings, raw, achievements } = stats
  const trendData = period === 'semanal' ? charts.weeklyVolumeChart : charts.monthlyVolumeChart
  const trendKey = period === 'semanal' ? 'week' : 'month'

  return (
    <div className="page-enter pb-10">
      <PageHeader eyebrow="Performance" title="Seu ritmo, em números." subtitle="Entenda o momento atual, reconheça sua consistência e descubra onde evoluir." />

      <section className="mb-12 grid gap-8 border-y border-[#272a2f] py-8 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="lg:col-span-5">
          <p className="rhc-kicker mb-4">Esta semana</p>
          <div className="flex items-end gap-3">
            <strong className="tabular-nums text-[clamp(4rem,9vw,7rem)] font-[780] leading-[.78] tracking-[-.075em] text-[#f5f7f2]">{summary.weeklyWorkouts}</strong>
            <span className="pb-1 text-lg font-bold text-[#92979f]">treinos</span>
          </div>
          <div className="mt-6"><Delta value={summary.comparisons.weeklyWorkouts} /></div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#92979f]">
            {summary.streak.current > 0 ? `Você mantém uma sequência de ${summary.streak.current} ${summary.streak.current === 1 ? 'semana ativa' : 'semanas ativas'}.` : 'Um novo treino inicia sua próxima sequência.'}
          </p>
        </div>

        <div className="relative min-h-[250px] lg:col-span-7">
          <div className="absolute right-1 top-0 text-right">
            <p className="tabular-nums text-3xl font-[760] tracking-[-.04em]">{formatNumber(summary.weeklyVolume)} kg</p>
            <Delta value={summary.comparisons.weeklyVolume} label="volume semanal" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={raw.sessions.slice(-14)} margin={{ top: 65, right: 4, bottom: 0, left: 4 }}>
              <defs><linearGradient id="heroVolume" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c8ff3d" stopOpacity=".3"/><stop offset="1" stopColor="#c8ff3d" stopOpacity="0"/></linearGradient></defs>
              <Tooltip {...chartTooltip} formatter={(value) => [`${formatNumber(value)} kg`, 'Volume']} />
              <Area type="monotone" dataKey="total_volume" stroke="#c8ff3d" strokeWidth={3} fill="url(#heroVolume)" dot={false} activeDot={{ r: 5, fill: '#c8ff3d', stroke: '#08090a', strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mb-14 grid grid-cols-2 gap-x-5 md:grid-cols-4">
        <Metric label="Volume total" value={`${formatNumber(summary.totalVolume)} kg`} detail={`${summary.totalWorkouts} sessões`} icon={Dumbbell} />
        <Metric label="Sequência" value={`${summary.streak.current} sem.`} detail={`melhor: ${summary.streak.best}`} icon={Flame} />
        <Metric label="Duração média" value={`${summary.averageDuration || 0} min`} detail="por treino" icon={Activity} />
        <Metric label="Maior sessão" value={`${formatNumber(summary.biggestWorkout?.total_volume)} kg`} detail={summary.biggestWorkout?.date || 'sem registro'} icon={Trophy} />
      </section>

      <section className="mb-16 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="rhc-kicker mb-2">Tendência</p><h2 className="text-3xl font-[760] tracking-[-.045em]">Carga em movimento</h2></div>
            <div className="flex rounded-full border border-[#272a2f] bg-[#0d0f11] p-1">
              {['semanal', 'mensal'].map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize transition-colors ${period === item ? 'bg-[#f5f7f2] text-[#08090a]' : 'text-[#92979f] hover:text-white'}`}>{item}</button>)}
            </div>
          </div>
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#202328" />
                <XAxis dataKey={trendKey} axisLine={false} tickLine={false} tick={{ fill: '#62676f', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#62676f', fontSize: 11 }} />
                <Tooltip {...chartTooltip} formatter={(value) => [`${formatNumber(value)} kg`, 'Volume']} />
                <Bar dataKey="volume" fill="#c8ff3d" radius={[6, 6, 0, 0]} maxBarSize={46} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <aside className="border-t border-[#272a2f] pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="rhc-kicker mb-5">Leitura rápida</p>
          <div className="space-y-7">
            <div><p className="text-sm text-[#92979f]">Volume no mês</p><p className="mt-1 tabular-nums text-3xl font-[760]">{formatNumber(summary.monthlyVolume)} kg</p><div className="mt-2"><Delta value={summary.comparisons.monthlyVolume} /></div></div>
            <div className="border-t border-[#272a2f] pt-6"><p className="text-sm text-[#92979f]">Movimento dominante</p><p className="mt-1 text-xl font-bold">{summary.mostTrainedExercise?.exerciseName || '-'}</p><p className="mt-1 text-xs text-[#62676f]">{summary.mostTrainedExercise?.total || 0} registros no histórico</p></div>
            <div className="border-t border-[#272a2f] pt-6"><p className="text-sm text-[#92979f]">Recordes monitorados</p><p className="mt-1 text-xl font-bold">{rankings.personalRecords.length} exercícios</p></div>
          </div>
        </aside>
      </section>

      <section className="mb-16">
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="rhc-kicker mb-2">Conquistas</p><h2 className="text-3xl font-[760] tracking-[-.045em]">Marcos da jornada</h2></div><Award className="h-6 w-6 text-[#c8ff3d]" /></div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">{achievements.map((item, index) => <Achievement key={item.id} item={item} index={index} />)}</div>
      </section>

      <section className="mb-16 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="rhc-kicker mb-2">Força</p><h2 className="text-3xl font-[760] tracking-[-.045em]">Evolução por exercício</h2></div>
            <select className="sm:max-w-64" value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)}>{exerciseNames.map((name) => <option key={name} value={name}>{name}</option>)}</select>
          </div>
          {selectedRecord && <div className="mb-5 flex flex-wrap gap-x-8 gap-y-3 border-y border-[#272a2f] py-4 text-sm"><span className="text-[#92979f]">Inicial <strong className="ml-1 text-white">{selectedRecord.firstWeight} kg</strong></span><span className="text-[#92979f]">Atual <strong className="ml-1 text-white">{selectedRecord.lastWeight} kg</strong></span><span className="text-[#92979f]">Recorde <strong className="ml-1 text-[#c8ff3d]">{selectedRecord.maxWeight} kg</strong></span><span className="font-bold text-[#74c7ff]">{selectedRecord.progress > 0 ? '+' : ''}{selectedRecord.progress}%</span></div>}
          <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={exerciseWeights} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#202328"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#62676f', fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#62676f', fontSize: 11 }}/><Tooltip {...chartTooltip} formatter={(value) => [`${value} kg`, 'Carga']}/><Line type="monotone" dataKey="weight" stroke="#74c7ff" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#74c7ff' }}/></LineChart></ResponsiveContainer></div>
        </div>
        <aside className="lg:col-span-4 lg:border-l lg:border-[#272a2f] lg:pl-8">
          <div className="mb-5 flex items-center gap-2"><Target className="h-4 w-4 text-[#c8ff3d]"/><h3 className="font-bold">Recordes pessoais</h3></div>
          <div>{rankings.personalRecords.slice(0, 6).map((item, index) => <div key={item.exerciseName} className="flex items-center justify-between border-t border-[#272a2f] py-4"><div className="min-w-0 pr-3"><p className="truncate text-sm font-bold">{item.exerciseName}</p><p className="mt-1 text-xs text-[#62676f]">#{index + 1} · {item.recordDate || '-'}</p></div><p className="tabular-nums whitespace-nowrap font-bold text-[#c8ff3d]">{item.maxWeight} kg</p></div>)}</div>
        </aside>
      </section>

      <section className="grid gap-10 border-t border-[#272a2f] pt-10 lg:grid-cols-2">
        <div><div className="mb-5 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#c8ff3d]"/><h2 className="text-xl font-bold">Ritmo da semana</h2></div><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={charts.weekdayFrequency}><CartesianGrid vertical={false} stroke="#202328"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#62676f' }}/><YAxis hide/><Tooltip {...chartTooltip}/><Bar dataKey="total" name="Treinos" fill="#c8ff3d" radius={[8,8,0,0]} maxBarSize={34}/></BarChart></ResponsiveContainer></div></div>
        <div><div className="mb-5 flex items-center gap-2"><Activity className="h-4 w-4 text-[#74c7ff]"/><h2 className="text-xl font-bold">Peso corporal</h2></div>{raw.measurements.length ? <div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={raw.measurements}><CartesianGrid vertical={false} stroke="#202328"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#62676f', fontSize: 11 }}/><YAxis domain={['dataMin - 2','dataMax + 2']} axisLine={false} tickLine={false} tick={{ fill: '#62676f', fontSize: 11 }}/><Tooltip {...chartTooltip}/><Line type="monotone" dataKey="weight" name="Peso" stroke="#74c7ff" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div> : <div className="grid h-56 place-items-center border-y border-[#272a2f] text-center text-sm text-[#62676f]">Registre medidas para visualizar a evolução corporal.</div>}</div>
      </section>
    </div>
  )
}
