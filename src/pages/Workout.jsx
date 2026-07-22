import { ArrowLeft, ChevronDown, ChevronUp, CloudOff, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import ExerciseCard from '../components/ExerciseCard'
import SmartExecutionPanel from '../components/SmartExecutionPanel'
import { supabase } from '../lib/supabaseClient'
import { getProfile } from '../services/profileService'
import { getWorkoutPlan } from '../services/planService'
import { calculateProgramSuggestion, getRecentProgramExposures, saveProgramExposure } from '../services/programExecutionService'
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
    window.addEventListener('online', handle); window.addEventListener('offline', handle)
    return () => { window.removeEventListener('online', handle); window.removeEventListener('offline', handle) }
  }, [])

  useEffect(() => {
    getProfile(profileId).then(async (value) => { setProfile(value); setWorkout(await getWorkoutPlan(value, type)) }).catch((error) => setMessage(friendlyError(error)))
  }, [profileId, type])

  useEffect(() => {
    if (!workout) return
    const initial = {}
    workout.exercises.forEach((exercise) => {
      initial[exercise.id] = { weight: '', actualReps: '', setReps: Array(Number(exercise.sets || 0)).fill(''), rpe: '', progressionAccepted: null, notes: '', completed: false, completedSets: Array(Number(exercise.sets || 0)).fill(false), difficulty: 'normal', selectedName: exercise.name, expanded: true, restTimerKey: null }
    })
    setExerciseValues(initial)
    getExerciseRecords(profileId, workout.exercises.flatMap((exercise) => [exercise.name, ...(exercise.alternatives || [])])).then(setRecords).catch(() => undefined)
  }, [workout, profileId])

  function updateExercise(id, value) { setExerciseValues((current) => ({ ...current, [id]: value })) }

  async function buildProgramExposure(exercise, values, workoutSessionId) {
    if (!exercise.programExerciseId || !exercise.programEnrollmentId) return
    const variation = values.selectedName || exercise.name
    const recent = await getRecentProgramExposures(exercise.programEnrollmentId, exercise.programExerciseId, variation, 3)
    let previousFailures = 0
    for (const item of recent) { if (item.progression_action === 'increase') break; previousFailures += 1 }
    const suggestion = calculateProgramSuggestion(exercise, values, previousFailures)
    await saveProgramExposure({ profileId, workoutSessionId, exercise, value: values, suggestion })
  }

  async function finalizeWorkout() {
    if (savingRef.current) return
    savingRef.current = true; setSaving(true); setMessage('')
    try {
      const exercises = workout.exercises.map((exercise) => { const values = exerciseValues[exercise.id] || {}; return { ...exercise, ...values, name: values.selectedName || exercise.name, originalName: exercise.name } })
      const payload = { profileId, workoutType: type, date, gymName: sanitizeText(gymName, 80), durationMinutes, notes, exercises }
      if (!isOnline()) {
        const { data: sessionData } = await supabase.auth.getSession(); addPendingWorkout(payload, sessionData.session?.user?.id)
        setMessage('Você está offline. Treino salvo no aparelho e será sincronizado quando a internet voltar.'); setTimeout(() => navigate(`/dashboard/${profileId}`), 900); return
      }
      const savedSession = await saveWorkoutSession(payload)
      if (workout.enrollment || workout.exercises.some((exercise) => exercise.programExerciseId)) {
        await Promise.all(workout.exercises.map((exercise) => buildProgramExposure(exercise, exerciseValues[exercise.id] || {}, savedSession?.id || null)))
      }
      setMessage('Treino salvo com sucesso.'); setTimeout(() => navigate(`/dashboard/${profileId}`), 700)
    } catch (error) { setMessage(friendlyError(error)) } finally { savingRef.current = false; setSaving(false) }
  }

  if (!profile || !workout) return <p className="text-[#8E8E93]">Carregando treino...</p>
  const done = Object.values(exerciseValues).filter((item) => item.completed).length
  const total = workout.exercises.length
  const pendingExercises = workout.exercises.filter((exercise) => !exerciseValues[exercise.id]?.completed)
  const completedExercises = workout.exercises.filter((exercise) => exerciseValues[exercise.id]?.completed)

  const renderExercise = (exercise) => (
    <div key={exercise.id}>
      <ExerciseCard exercise={exercise} value={exerciseValues[exercise.id] || {}} record={records[(exerciseValues[exercise.id] || {}).selectedName || exercise.name]} onChange={(value) => updateExercise(exercise.id, value)} />
      {exercise.programExerciseId && <SmartExecutionPanel exercise={exercise} value={exerciseValues[exercise.id] || {}} onChange={(value) => updateExercise(exercise.id, value)} />}
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <div className="mb-7 flex items-center justify-between">
        <Link to={`/dashboard/${profileId}`} className="grid h-10 w-10 place-items-center text-[#8E8E93]" aria-label="Voltar"><ArrowLeft size={22} /></Link>
        <div className="text-center"><p className="text-xs uppercase tracking-[.16em] text-[#8E8E93]">Treino {type}</p><p className="text-sm font-semibold text-[#F5F5F7]">{done} de {total}</p></div>
        <span className={`h-2 w-2 rounded-full ${online ? 'bg-[#C8FF3D]' : 'bg-amber-400'}`} title={online ? 'Online' : 'Offline'} />
      </div>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[#F5F5F7]">{workout.title}</h1>
        {workout.description && <p className="mt-2 text-sm text-[#8E8E93]">{workout.description}</p>}
        {workout.enrollment && <p className="mt-2 text-xs font-semibold uppercase tracking-[.12em] text-[#C8FF3D]">{workout.program?.name} · Semana {workout.enrollment?.current_week || workout.phase?.week_start || 1}{workout.phase?.name ? ` · ${workout.phase.name}` : ''}</p>}
      </header>

      <button type="button" onClick={() => setShowDetails((current) => !current)} className="mb-3 flex w-full items-center justify-between border-y border-[#2A2A2E] py-3 text-left text-sm font-semibold text-[#F5F5F7]">
        Detalhes do treino {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} className="text-[#8E8E93]" />}
      </button>
      {showDetails && (
        <div className="mb-6 grid gap-3 bg-[#141416] p-4 md:grid-cols-3">
          <label><span className="mb-1 block text-xs text-[#8E8E93]">Academia</span><input value={gymName} onChange={(event) => setGymName(event.target.value)} maxLength={80} placeholder="Ex: Smart Fit Centro" /></label>
          <label><span className="mb-1 block text-xs text-[#8E8E93]">Data</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label><span className="mb-1 block text-xs text-[#8E8E93]">Duração</span><input type="number" min="0" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-[#8E8E93]">Observação geral</span><textarea rows="2" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Como foi o treino?" /></label>
        </div>
      )}

      <section>{pendingExercises.map(renderExercise)}</section>
      {completedExercises.length > 0 && <section className="mt-8"><h2 className="mb-2 text-lg font-semibold text-[#F5F5F7]">Concluídos</h2>{completedExercises.map(renderExercise)}</section>}

      {message && <p className="mt-4 border border-[#2A2A2E] bg-[#141416] p-3 text-sm text-[#F5F5F7]">{message}</p>}
      <Button onClick={finalizeWorkout} disabled={saving} className="sticky bottom-24 z-20 mt-8 w-full" icon={online ? Save : CloudOff}>{saving ? 'Salvando...' : 'Finalizar treino'}</Button>
    </div>
  )
}
