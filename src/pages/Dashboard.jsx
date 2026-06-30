import { Activity, BarChart3, CalendarDays, Camera, Dumbbell, Flame, History, LineChart, Ruler, Scale, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardCard from '../components/DashboardCard'
import { getProfile } from '../services/profileService'
import { getDashboardSummary } from '../services/workoutService'
import { friendlyError } from '../utils/validation'

export default function Dashboard() {
  const { profileId } = useParams()
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getProfile(profileId), getDashboardSummary(profileId)])
      .then(([p, s]) => { setProfile(p); setSummary(s) })
      .catch((err) => setError(friendlyError(err)))
  }, [profileId])

  if (error) return <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-red-100">{error}</p>
  if (!profile || !summary) return <p className="text-slate-400">Carregando dashboard...</p>

  const shortcuts = [
    { label: 'Histórico', to: `/history/${profileId}`, icon: History },
    { label: 'Evolução', to: `/progress/${profileId}`, icon: BarChart3 },
    { label: 'Medidas', to: `/measurements/${profileId}`, icon: Ruler },
    { label: 'Fotos', to: `/photos/${profileId}`, icon: Camera }
  ]

  return (
    <div>
      <header className="mb-6">
        <p className="text-sm font-bold text-emerald-300">Dashboard</p>
        <h1 className="text-3xl font-black">{profile.name}</h1>
        <p className="text-slate-400">{profile.goal}</p>
      </header>

      <section className="card-glow mb-5">
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Último treino feito</p>
            <h2 className="mt-1 text-2xl font-black">{summary.lastWorkout ? `Treino ${summary.lastWorkout.workout_type}` : 'Nenhum treino ainda'}</h2>
            {summary.lastWorkout && <p className="mt-2 text-slate-300">{summary.lastWorkout.date} • {summary.lastWorkout.gym_name || 'Academia não informada'}</p>}
          </div>
          <span className="badge-success">{summary.lastWorkout ? 'Em progresso' : 'Começar'}</span>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <DashboardCard title="Semana" value={summary.weekCount} subtitle="treinos" icon={CalendarDays} />
        <DashboardCard title="Mês" value={summary.monthCount} subtitle="treinos" icon={Activity} />
        <DashboardCard title="Sequência" value={summary.currentStreak} subtitle="atual" icon={Flame} />
        <DashboardCard title="Melhor seq." value={summary.bestStreak} subtitle="dias" icon={Trophy} />
        <DashboardCard title="Volume total" value={`${Math.round(summary.totalVolume)} kg`} subtitle="levantado" icon={Dumbbell} />
        <DashboardCard title="Peso atual" value={summary.lastMeasurement?.weight ? `${summary.lastMeasurement.weight} kg` : '-'} subtitle={summary.lastMeasurement?.date || 'sem registro'} icon={Scale} />
      </div>

      <section className="mb-5 grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          {['A', 'B', 'C'].map((type) => (
            <Link key={type} to={`/workout/${profileId}/${type}`} className="btn-primary flex min-h-24 flex-col items-center justify-center gap-2 text-center">
              <Dumbbell size={24} />
              Treino {type}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {shortcuts.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.label} to={item.to} className="btn-secondary flex items-center justify-between gap-3">
              {item.label} <Icon size={20} />
            </Link>
          )
        })}
        <Link to={`/progress/${profileId}`} className="btn-secondary col-span-2 flex items-center justify-between">
          Ver gráficos completos <LineChart size={20} />
        </Link>
      </section>
    </div>
  )
}
