import {
  Activity,
  BarChart3,
  Camera,
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
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import SectionTitle from '../components/ui/SectionTitle'
import StatCard from '../components/ui/StatCard'
import { getProfile } from '../services/profileService'
import { getAvailablePlanTypes } from '../services/planService'
import { getDashboardSummary } from '../services/workoutService'
import { friendlyError } from '../utils/validation'
import { getNextWorkoutType } from '../utils/workoutRotation'
import { getTodaySchedule } from '../services/scheduleService'

const workoutDescriptions = {
  A: 'Peito • Ombro • Tríceps',
  B: 'Costas • Bíceps',
  C: 'Pernas • Core',
  D: 'Força funcional • Posterior',
  E: 'Condicionamento • Corrida'
}

export default function Dashboard() {
  const { profileId } = useParams()
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [availableWorkoutTypes, setAvailableWorkoutTypes] = useState(['A','B','C'])
  const [todaySchedule,setTodaySchedule]=useState({configured:false,workoutType:null})
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile(profileId).then(async (p) => {
      const [s, types, schedule] = await Promise.all([getDashboardSummary(profileId), getAvailablePlanTypes(p),getTodaySchedule(profileId)])
        setProfile(p)
        setSummary(s)
        setAvailableWorkoutTypes(types)
        setTodaySchedule(schedule)
      })
      .catch((err) => setError(friendlyError(err)))
  }, [profileId])

  const nextWorkout = useMemo(() => {
    if(todaySchedule.configured) return todaySchedule.workoutType
    return getNextWorkoutType(summary?.lastWorkout?.workout_type, availableWorkoutTypes)
  }, [summary, availableWorkoutTypes,todaySchedule])

  if (error) {
    return (
      <Card className="border-red-400/30 bg-red-400/10 text-red-100">
        {error}
      </Card>
    )
  }

  if (!profile || !summary) {
    return <p className="text-slate-400">Carregando dashboard...</p>
  }

  const weeklyTarget = profile.name === 'Nicole' ? 3 : 5
  const weeklyPercent = Math.min(100, Math.round((summary.weekCount / weeklyTarget) * 100))
  const lastWorkoutDate = summary.lastWorkout?.date || 'Nenhum treino registrado'

  return (
    <div>
      <PageHeader
        eyebrow="RHC Training"
        title={`Bom treino, ${profile.name}`}
        subtitle="Foco hoje, resultado sempre."
        action={
          <Link
            to="/profiles"
            className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
            aria-label="Trocar perfil"
          >
            <UserRound size={21} />
          </Link>
        }
      />

      <Card glow className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Badge variant="green">Treino de hoje</Badge>
          <Badge variant="slate">{lastWorkoutDate}</Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
            <Dumbbell size={30} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-black text-white">{nextWorkout?`Treino ${nextWorkout}`:'Dia de descanso'}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {nextWorkout?(workoutDescriptions[nextWorkout] || 'Treino personalizado'):'Recupere-se para o proximo treino.'}
            </p>
          </div>
        </div>

        {nextWorkout&&<Link to={`/workout/${profileId}/${nextWorkout}`} className="mt-5 block">
          <Button className="w-full" icon={Play}>
            Iniciar treino
          </Button>
        </Link>}
      </Card>

      <Card className="mb-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-white">Meta semanal</p>
            <p className="text-sm text-slate-400">
              {summary.weekCount} de {weeklyTarget} treinos concluídos
            </p>
          </div>

          <Badge variant={weeklyPercent >= 100 ? 'green' : 'slate'}>
            {weeklyPercent}%
          </Badge>
        </div>

        <ProgressBar value={weeklyPercent} />

        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: weeklyTarget }).map((_, index) => {
            const completed = index < summary.weekCount

            return (
              <div
                key={index}
                className={`h-2 rounded-full ${
                  completed ? 'bg-emerald-400' : 'bg-slate-800'
                }`}
              />
            )
          })}
        </div>
      </Card>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <StatCard
          title="Volume total"
          value={`${Math.round(summary.totalVolume)} kg`}
          subtitle="levantado"
          icon={Dumbbell}
        />

        <StatCard
          title="Peso atual"
          value={summary.lastMeasurement?.weight ? `${summary.lastMeasurement.weight} kg` : '-'}
          subtitle={summary.lastMeasurement?.date || 'sem registro'}
          icon={Scale}
        />

        <StatCard
          title="Sequência"
          value={summary.currentStreak}
          subtitle="dias"
          icon={Flame}
        />

        <StatCard
          title="Melhor seq."
          value={summary.bestStreak}
          subtitle="dias"
          icon={Trophy}
        />
      </section>

      <SectionTitle
        title="Escolher treino"
        subtitle={profile.name === 'Nicole' ? 'Rotina A/B/C' : 'Rotina A/B/C/D/E'}
      />

      <section
        className={`mb-5 grid gap-3 ${
          availableWorkoutTypes.length > 3 ? 'grid-cols-5' : 'grid-cols-3'
        }`}
      >
        {availableWorkoutTypes.map((workoutType) => (
          <Link
            key={workoutType}
            to={`/workout/${profileId}/${workoutType}`}
            className={`rounded-3xl border px-3 py-4 text-center transition ${
              workoutType === nextWorkout
                ? 'border-emerald-400 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/40'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-emerald-400/50 hover:text-white'
            }`}
          >
            <Dumbbell size={22} className="mx-auto mb-2" />
            <p className="font-black">Treino {workoutType}</p>
          </Link>
        ))}
      </section>

      <SectionTitle title="Acessos rápidos" />

      <section className="grid grid-cols-2 gap-3">
        <Link
          to={`/history/${profileId}`}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-300 transition hover:border-emerald-400/50 hover:text-white"
        >
          <History size={22} className="mb-3 text-emerald-300" />
          <p className="font-black">Histórico</p>
          <p className="text-xs text-slate-500">Treinos salvos</p>
        </Link>

        <Link
          to={`/progress/${profileId}`}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-300 transition hover:border-emerald-400/50 hover:text-white"
        >
          <BarChart3 size={22} className="mb-3 text-emerald-300" />
          <p className="font-black">Evolução</p>
          <p className="text-xs text-slate-500">Gráficos e cargas</p>
        </Link>

        <Link
          to={`/measurements/${profileId}`}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-300 transition hover:border-emerald-400/50 hover:text-white"
        >
          <Activity size={22} className="mb-3 text-emerald-300" />
          <p className="font-black">Medidas</p>
          <p className="text-xs text-slate-500">Peso e corpo</p>
        </Link>

        <Link
          to={`/photos/${profileId}`}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-300 transition hover:border-emerald-400/50 hover:text-white"
        >
          <Camera size={22} className="mb-3 text-emerald-300" />
          <p className="font-black">Fotos</p>
          <p className="text-xs text-slate-500">Evolução visual</p>
        </Link>
      </section>
    </div>
  )
}
