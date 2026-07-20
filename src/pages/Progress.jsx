import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Flame,
  Medal,
  Trophy
} from 'lucide-react'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import SectionTitle from '../components/ui/SectionTitle'
import StatCard from '../components/ui/StatCard'
import { getStatsCenter } from '../services/statsService'
import { friendlyError } from '../utils/validation'

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="border-t border-[#272a2f] pt-6">
      <div className="mb-4">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="h-64">{children}</div>
    </section>
  )
}

export default function Progress() {
  const { profileId } = useParams()
  const [stats, setStats] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getStatsCenter(profileId)
      .then((result) => {
        setStats(result)
        setSelectedExercise(result.raw.exercises[0]?.exercise_name || '')
      })
      .catch((err) => setError(friendlyError(err)))
  }, [profileId])

  const exerciseNames = useMemo(() => {
    if (!stats) return []
    return [...new Set(stats.raw.exercises.map((item) => item.exercise_name))]
  }, [stats])

  const exerciseWeights = useMemo(() => {
    if (!stats) return []
    return stats.raw.exercises.filter((item) => item.exercise_name === selectedExercise)
  }, [stats, selectedExercise])

  const selectedRecord = useMemo(() => {
    if (!stats) return null
    return stats.rankings.personalRecords.find((item) => item.exerciseName === selectedExercise) || null
  }, [stats, selectedExercise])

  if (error) {
    return (
      <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-red-100">
        {error}
      </p>
    )
  }

  if (!stats) {
    return <p className="text-slate-400">Carregando estatísticas...</p>
  }

  const { summary, charts, rankings, raw } = stats

  if (!summary.totalWorkouts) {
    return (
      <div>
        <PageHeader
          eyebrow="Evolução"
          title="Centro de Estatísticas"
          subtitle="Acompanhe sua evolução de treino."
        />
        <EmptyState
          title="Nenhum treino registrado ainda"
          description="Finalize alguns treinos para gerar estatísticas, recordes e gráficos."
          icon={Dumbbell}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Evolução"
        title="Centro de Estatísticas"
        subtitle="Volume, frequência, recordes e evolução de cargas."
      />

      <section className="mb-5 grid grid-cols-2 gap-3">
        <StatCard
          title="Treinos"
          value={summary.totalWorkouts}
          subtitle="registrados"
          icon={CalendarDays}
        />

        <StatCard
          title="Volume total"
          value={`${Math.round(summary.totalVolume)} kg`}
          subtitle="acumulado"
          icon={Dumbbell}
        />

        <StatCard
          title="Volume semanal"
          value={`${Math.round(summary.weeklyVolume)} kg`}
          subtitle="semana atual"
          icon={Flame}
        />

        <StatCard
          title="Volume mensal"
          value={`${Math.round(summary.monthlyVolume)} kg`}
          subtitle="mês atual"
          icon={Activity}
        />
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <StatCard
          title="Tempo médio"
          value={summary.averageDuration ? `${summary.averageDuration} min` : '-'}
          subtitle="por treino"
          icon={Activity}
        />

        <StatCard
          title="Maior treino"
          value={summary.biggestWorkout ? `${Math.round(summary.biggestWorkout.total_volume)} kg` : '-'}
          subtitle={summary.biggestWorkout?.date || 'sem dados'}
          icon={Trophy}
        />

        <StatCard
          title="Mais treinado"
          value={summary.mostTrainedExercise?.exerciseName || '-'}
          subtitle={summary.mostTrainedExercise ? `${summary.mostTrainedExercise.total} vezes` : 'sem dados'}
          icon={Medal}
          className="col-span-2"
        />
      </section>

      <div className="grid gap-4">
        <ChartCard
          title="Volume por treino"
          subtitle="Carga total registrada em cada sessão"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={raw.sessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#272a2f" />
              <XAxis dataKey="date" stroke="#62676f" />
              <YAxis stroke="#62676f" />
              <Tooltip />
              <Area type="monotone" dataKey="total_volume" name="Volume" stroke="#c8ff3d" fill="#c8ff3d" fillOpacity={0.12} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Volume semanal"
          subtitle="Evolução do volume por semana"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.weeklyVolumeChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#272a2f" />
              <XAxis dataKey="week" stroke="#62676f" />
              <YAxis stroke="#62676f" />
              <Tooltip />
              <Bar dataKey="volume" name="Volume" fill="#c8ff3d" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Volume mensal"
          subtitle="Evolução do volume por mês"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.monthlyVolumeChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#272a2f" />
              <XAxis dataKey="month" stroke="#62676f" />
              <YAxis stroke="#62676f" />
              <Tooltip />
              <Bar dataKey="volume" name="Volume" fill="#74c7ff" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Carga por exercício</h2>
              <p className="text-sm text-slate-400">Acompanhe sua evolução por movimento</p>
            </div>

            <select
              className="max-w-48"
              value={selectedExercise}
              onChange={(event) => setSelectedExercise(event.target.value)}
            >
              {exerciseNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {selectedRecord && <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-950/60 p-3"><p className="text-xs text-slate-500">Primeira carga</p><p className="text-lg font-black">{selectedRecord.firstWeight} kg</p></div>
            <div className="rounded-2xl bg-slate-950/60 p-3"><p className="text-xs text-slate-500">Carga atual</p><p className="text-lg font-black">{selectedRecord.lastWeight} kg</p></div>
            <div className="rounded-2xl bg-emerald-400/10 p-3"><p className="text-xs text-emerald-200/70">Recorde</p><p className="text-lg font-black text-emerald-300">{selectedRecord.maxWeight} kg</p></div>
            <div className={`rounded-2xl p-3 ${selectedRecord.progress >= 0?'bg-sky-400/10':'bg-amber-400/10'}`}><p className="text-xs text-slate-400">Evolucao</p><p className={`text-lg font-black ${selectedRecord.progress >= 0?'text-sky-300':'text-amber-300'}`}>{selectedRecord.progress > 0?'+':''}{selectedRecord.progress}%</p></div>
          </div>}

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={exerciseWeights}>
                <CartesianGrid strokeDasharray="3 3" stroke="#272a2f" />
                <XAxis dataKey="date" stroke="#62676f" />
                <YAxis stroke="#62676f" />
                <Tooltip />
                <Line type="monotone" dataKey="weight" name="Carga" stroke="#c8ff3d" strokeWidth={3} dot={{fill:'#c8ff3d'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <ChartCard
          title="Frequência por dia"
          subtitle="Dias da semana com mais treinos"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.weekdayFrequency}>
              <CartesianGrid strokeDasharray="3 3" stroke="#272a2f" />
              <XAxis dataKey="day" stroke="#62676f" />
              <YAxis allowDecimals={false} stroke="#62676f" />
              <Tooltip />
              <Bar dataKey="total" name="Treinos" fill="#c8ff3d" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <SectionTitle
          title="Recordes pessoais"
          subtitle="Maiores cargas registradas por exercício"
        />

        <Card>
          <div className="grid gap-3">
            {rankings.personalRecords.slice(0, 10).map((item) => (
              <div
                key={item.exerciseName}
                className="flex items-center justify-between rounded-2xl bg-slate-950/60 p-3"
              >
                <div>
                  <p className="font-bold text-white">{item.exerciseName}</p>
                  <p className="text-xs text-slate-500">
                    {item.total} registros · recorde em {item.recordDate || '-'}
                  </p>
                </div>

                <div className="text-right"><p className="text-lg font-black text-emerald-300">{item.maxWeight} kg</p><p className={`text-xs font-bold ${item.progress>=0?'text-sky-300':'text-amber-300'}`}>{item.progress>0?'+':''}{item.progress}% atual</p></div>
              </div>
            ))}
          </div>
        </Card>

        <SectionTitle
          title="Exercícios mais treinados"
          subtitle="Ranking por frequência no histórico"
        />

        <Card>
          <div className="grid gap-3">
            {rankings.exerciseRanking.slice(0, 10).map((item, index) => (
              <div
                key={item.exerciseName}
                className="flex items-center justify-between rounded-2xl bg-slate-950/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-800 text-sm font-black text-slate-300">
                    {index + 1}
                  </div>

                  <div>
                    <p className="font-bold text-white">{item.exerciseName}</p>
                    <p className="text-xs text-slate-500">
                      {Math.round(item.totalVolume)} kg acumulados
                    </p>
                  </div>
                </div>

                <p className="font-black text-emerald-300">
                  {item.total}x
                </p>
              </div>
            ))}
          </div>
        </Card>

        <ChartCard title="Peso corporal">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={raw.measurements}>
              <CartesianGrid strokeDasharray="3 3" stroke="#272a2f" />
              <XAxis dataKey="date" stroke="#62676f" />
              <YAxis stroke="#62676f" />
              <Tooltip />
              <Line type="monotone" dataKey="weight" name="Peso" stroke="#c8ff3d" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Medidas corporais">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={raw.measurements}>
              <CartesianGrid strokeDasharray="3 3" stroke="#272a2f" />
              <XAxis dataKey="date" stroke="#62676f" />
              <YAxis stroke="#62676f" />
              <Tooltip />
              <Line type="monotone" dataKey="waist" name="Cintura" stroke="#c8ff3d" dot={false} />
              <Line type="monotone" dataKey="chest" name="Peito" stroke="#74c7ff" dot={false} />
              <Line type="monotone" dataKey="arm" name="Braco" stroke="#a78bfa" dot={false} />
              <Line type="monotone" dataKey="thigh" name="Coxa" stroke="#ffb55e" dot={false} />
              <Line type="monotone" dataKey="hip" name="Quadril" stroke="#ff6b70" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
