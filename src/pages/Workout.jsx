import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CloudOff,
  Save
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import ExerciseCard from '../components/ExerciseCard'
import { supabase } from '../lib/supabaseClient'
import { getProfile } from '../services/profileService'
import { getWorkoutPlan } from '../services/planService'
import { getExerciseRecords, saveWorkoutSession } from '../services/workoutService'
import { addPendingWorkout, isOnline } from '../utils/storage'
import { friendlyError, sanitizeText } from '../utils/validation'
import { toLocalDateKey } from '../utils/date'

const today = () => toLocalDateKey()

export default function Workout() {
  const { profileId, type } = useParams()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [workout, setWorkout] = useState(null)
  const [records, setRecords] = useState({})
  const [gymName, setGymName] = useState('')
  const [date, setDate] = useState(today())
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [notes, setNotes] = useState('')
  const [exerciseValues, setExerciseValues] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [online, setOnline] = useState(isOnline())
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const handle = () => setOnline(isOnline())

    window.addEventListener('online', handle)
    window.addEventListener('offline', handle)

    return () => {
      window.removeEventListener('online', handle)
      window.removeEventListener('offline', handle)
    }
  }, [])

  useEffect(() => {
    getProfile(profileId)
      .then(async (value) => {
        setProfile(value)
        setWorkout(await getWorkoutPlan(value, type))
      })
      .catch((error) => setMessage(friendlyError(error)))
  }, [profileId])

  useEffect(() => {
    if (!workout) return

    const initial = {}

    workout.exercises.forEach((exercise) => {
      initial[exercise.id] = {
        weight: '',
        actualReps: '',
        notes: '',
        completed: false,
        completedSets: Array(Number(exercise.sets || 0)).fill(false),
        difficulty: 'normal',
        selectedName: exercise.name,
        expanded: true,
        restTimerKey: null
      }
    })

    setExerciseValues(initial)

    getExerciseRecords(
      profileId,
      workout.exercises.flatMap((exercise) => [
        exercise.name,
        ...(exercise.alternatives || [])
      ])
    )
      .then(setRecords)
      .catch(() => undefined)
  }, [workout, profileId])

  function updateExercise(id, value) {
    setExerciseValues((current) => ({
      ...current,
      [id]: value
    }))
  }

  async function finalizeWorkout() {
    if (savingRef.current) return

    savingRef.current = true
    setSaving(true)
    setMessage('')

    try {
      const exercises = workout.exercises.map((exercise) => {
        const values = exerciseValues[exercise.id] || {}

        return {
          ...exercise,
          ...values,
          name: values.selectedName || exercise.name,
          originalName: exercise.name
        }
      })

      const payload = {
        profileId,
        workoutType: type,
        date,
        gymName: sanitizeText(gymName, 80),
        durationMinutes,
        notes,
        exercises
      }

      if (!isOnline()) {
        const { data: sessionData } = await supabase.auth.getSession()
        const ownerUserId = sessionData.session?.user?.id
        addPendingWorkout(payload, ownerUserId)
        setMessage('Você está offline. Treino salvo no aparelho e será sincronizado quando a internet voltar.')
        setTimeout(() => navigate(`/dashboard/${profileId}`), 900)
        return
      }

      await saveWorkoutSession(payload)
      setMessage('Treino salvo com sucesso.')
      setTimeout(() => navigate(`/dashboard/${profileId}`), 700)
    } catch (error) {
      setMessage(friendlyError(error))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (!profile || !workout) {
    return <p className="text-slate-400">Carregando treino...</p>
  }

  const done = Object.values(exerciseValues).filter((item) => item.completed).length
  const total = workout.exercises.length
  const progress = total ? Math.round((done / total) * 100) : 0

  return (
    <div>
      <Link
        to={`/dashboard/${profileId}`}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"
      >
        <ArrowLeft size={18} />
        Voltar
      </Link>

      <PageHeader
        eyebrow={`Treino ${type}`}
        title={workout.title}
        subtitle={`${profile.name} • ${done}/${total} exercícios concluídos`}
        action={
          <Badge variant={online ? 'green' : 'amber'}>
            {online ? 'Online' : 'Offline'}
          </Badge>
        }
      />

      {workout.description && (
        <Card className="mb-4">
          <p className="text-sm text-slate-400">{workout.description}</p>
        </Card>
      )}

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-white">Progresso do treino</p>
            <p className="text-sm text-slate-400">
              {done} de {total} exercícios concluídos
            </p>
          </div>

          <Badge variant={progress === 100 ? 'green' : 'slate'}>
            {progress}%
          </Badge>
        </div>

        <ProgressBar value={progress} />
      </Card>

      <Card className="mb-4">
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className="font-bold text-white">Detalhes do treino</p>
            <p className="text-sm text-slate-400">
              Academia, data, duração e observação
            </p>
          </div>

          {showDetails ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </button>

        {showDetails && (
          <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 md:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-300">
                Academia
              </span>
              <input
                value={gymName}
                onChange={(event) => setGymName(event.target.value)}
                maxLength={80}
                placeholder="Ex: Smart Fit Centro"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-300">
                Data
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-300">
                Duração
              </span>
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
            </label>

            <label className="md:col-span-3">
              <span className="mb-1 block text-sm font-semibold text-slate-300">
                Observação geral
              </span>
              <textarea
                rows="2"
                maxLength={500}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Como foi o treino?"
              />
            </label>
          </div>
        )}
      </Card>

      <div className="grid gap-4">
        {workout.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            value={exerciseValues[exercise.id] || {}}
            record={records[(exerciseValues[exercise.id] || {}).selectedName || exercise.name]}
            onChange={(value) => updateExercise(exercise.id, value)}
          />
        ))}
      </div>

      {message && (
        <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
          {message}
        </p>
      )}

      <Button
        onClick={finalizeWorkout}
        disabled={saving}
        className="mt-5 w-full"
        icon={online ? Save : CloudOff}
      >
        {saving ? 'Salvando...' : 'Finalizar treino'}
      </Button>
    </div>
  )
}
