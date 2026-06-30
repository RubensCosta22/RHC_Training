import { ArrowLeft, CloudOff, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ExerciseCard from '../components/ExerciseCard'
import { getWorkout } from '../data/workouts'
import { getProfile } from '../services/profileService'
import { getExerciseRecords, saveWorkoutSession } from '../services/workoutService'
import { addPendingWorkout, isOnline } from '../utils/storage'
import { friendlyError, sanitizeText } from '../utils/validation'

const today = () => new Date().toISOString().slice(0, 10)

export default function Workout() {
  const { profileId, type } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [records, setRecords] = useState({})
  const [gymName, setGymName] = useState('')
  const [date, setDate] = useState(today())
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [notes, setNotes] = useState('')
  const [exerciseValues, setExerciseValues] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [online, setOnline] = useState(isOnline())

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
    getProfile(profileId).then(setProfile).catch((error) => setMessage(friendlyError(error)))
  }, [profileId])

  const workout = useMemo(() => profile ? getWorkout(profile.name, type) : null, [profile, type])

  useEffect(() => {
    if (!workout) return
    const initial = {}
    workout.exercises.forEach((exercise) => {
      initial[exercise.id] = { weight: '', actualReps: '', notes: '', completed: false, difficulty: 'normal', selectedName: exercise.name }
    })
    setExerciseValues(initial)
    getExerciseRecords(profileId, workout.exercises.flatMap((exercise) => [exercise.name, ...(exercise.alternatives || [])]))
      .then(setRecords)
      .catch(() => undefined)
  }, [workout, profileId])

  function updateExercise(id, value) {
    setExerciseValues((current) => ({ ...current, [id]: value }))
  }

  async function finalizeWorkout() {
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
        addPendingWorkout(payload)
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
      setSaving(false)
    }
  }

  if (!profile || !workout) return <p className="text-slate-400">Carregando treino...</p>

  const done = Object.values(exerciseValues).filter((item) => item.completed).length

  return (
    <div>
      <header className="mb-5">
        <Link to={`/dashboard/${profileId}`} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"><ArrowLeft size={18} /> Voltar</Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-300">Treino {type}</p>
            <h1 className="text-3xl font-black">{workout.title}</h1>
            <p className="text-slate-400">{profile.name} • {done}/{workout.exercises.length} concluídos</p>
          </div>
          <span className={`badge ${online ? 'border-emerald-400/50 text-emerald-200' : 'border-amber-400/50 text-amber-200'}`}>{online ? 'Online' : 'Offline'}</span>
        </div>
      </header>

      <section className="card mb-4 grid gap-3 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-semibold text-slate-300">Academia</span>
          <input value={gymName} onChange={(event) => setGymName(event.target.value)} maxLength={80} placeholder="Ex: Smart Fit Centro" />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-slate-300">Data</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-slate-300">Duração (min)</span>
          <input type="number" min="0" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} />
        </label>
        <label className="md:col-span-3">
          <span className="mb-1 block text-sm font-semibold text-slate-300">Observação geral</span>
          <textarea rows="2" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Como foi o treino?" />
        </label>
      </section>

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

      {message && <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p>}

      <button onClick={finalizeWorkout} disabled={saving} className="btn-primary mt-5 flex w-full items-center justify-center gap-2">
        {online ? <Save size={20} /> : <CloudOff size={20} />} {saving ? 'Salvando...' : 'Finalizar treino'}
      </button>
    </div>
  )
}
