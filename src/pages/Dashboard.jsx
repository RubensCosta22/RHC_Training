import {
  Activity,
  BarChart3,
  Dumbbell,
  Flame,
  History,
  Play,
  Scale,
  Trophy,
  UserRound
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProfile } from '../services/profileService'
import { getDashboardSummary } from '../services/workoutService'
import { friendlyError } from '../utils/validation'

function getNextWorkoutType(lastWorkoutType) {
  if (lastWorkoutType === 'A') return 'B'
  if (lastWorkoutType === 'B') return 'C'
  return 'A'
}

export default function Dashboard() {
  const { profileId } = useParams()
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getProfile(profileId), getDashboardSummary(profileId)])
      .then(([p, s]) => {
        setProfile(p)
        setSummary(s)
      })
      .catch((err) => setError(friendlyError(err)))
  }, [profileId])

  const nextWorkout = useMemo(() => {
    return getNextWorkoutType(summary?.lastWorkout?.workout_type)
  }, [summary])

  if (error) {
    return (
      <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-red-100">
        {error}
      </p>
    )
  }

  if (!profile || !summary) {
    return <p className="text-slate-400">Carregando dashboard...</p>
  }

  const weeklyTarget = 5
  const weeklyPercent = Math.min(100, Math.round((summary.weekCount / weeklyTarget) * 100))

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Bom treino,</p>
          <h1 className="text-3xl font-black">
            {profile.name}
            <span className="text-emerald-300">.</span>
          </h1>
          <p className="mt-1 text-slate-400">Foco hoje, resultado sempre.</p>
        </div>

        <Link
          to="/profiles"
          className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300"
          aria-label="Trocar perfil"
        >
          <UserRound size={21} />
        </Link>
      </header>

      <section className="card-glow mb-5">
        <p className="mb-3 text-sm font-bold text-slate-300">Treino de hoje</p>

        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
            <Dumbbell size={30} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black">Treino {nextWorkout}</h2>
            <p className="text-sm text-slate-400">
              {nextWorkout === 'A' && 'Peito • Ombro • Tríceps'}
              {nextWorkout === 'B' && 'Costas • Bíceps'}
              {nextWorkout === 'C' && 'Pernas • Core'}
            </p>
          </div>
        </div>

        <Link
          to={`/workout/${profileId}/${nextWorkout}`}
          className="btn-primary mt-5 flex w-full items-center justify-center gap-2"
        >
          <Play size={18} />
          Iniciar treino
        </Link>
      </section>

      <section className="card mb-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold">Progresso semanal</p>
          <p className="text-sm text-slate-300">
            {summary.weekCount} de {weeklyTarget} treinos
          </p>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${weeklyPercent}%` }}
          />
        </div>

        <p className="mt-2 text-right text-sm font-bold text-emerald-300">
          {weeklyPercent}%
        </p>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-400">Volume total</p>
            <Dumbbell size={18} className="text-emerald-300" />
          </div>
          <p className="text-2xl font-black">{Math.round(summary.totalVolume)} kg</p>
          <p className="mt-1 text-xs text-slate-500">levantado</p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-400">Peso atual</p>
            <Scale size={18} className="text-emerald-300" />
          </div>
          <p className="text-2xl font-black">
            {summary.lastMeasurement?.weight ? `${summary.lastMeasurement.weight} kg` : '-'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.lastMeasurement?.date || 'sem registro'}
          </p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-400">Sequência</p>
            <Flame size={18} className="text-emerald-300" />
          </div>
          <p className="text-2xl font-black">{summary.currentStreak}</p>
          <p className="mt-1 text-xs text-slate-500">dias</p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-400">Melhor seq.</p>
            <Trophy size={18} className="text-emerald-300" />
          </div>
          <p className="text-2xl font-black">{summary.bestStreak}</p>
          <p className="mt-1 text-xs text-slate-500">dias</p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {['A', 'B', 'C'].map((workoutType) => (
          <Link
            key={workoutType}
            to={`/workout/${profileId}/${workoutType}`}
            className="btn-secondary flex flex-col items-center justify-center gap-2 text-center"
          >
            <Dumbbell size={22} />
            Treino {workoutType}
          </Link>
        ))}
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <Link
          to={`/history/${profileId}`}
          className="btn-secondary flex items-center justify-between"
        >
          Histórico <History size={20} />
        </Link>

        <Link
          to={`/progress/${profileId}`}
          className="btn-secondary flex items-center justify-between"
        >
          Evolução <BarChart3 size={20} />
        </Link>

        <Link
          to={`/measurements/${profileId}`}
          className="btn-secondary flex items-center justify-between"
        >
          Medidas <Activity size={20} />
        </Link>

        <Link
          to="/profiles"
          className="btn-secondary flex items-center justify-between"
        >
          Trocar perfil <UserRound size={20} />
        </Link>
      </section>
    </div>
  )
}