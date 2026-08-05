import { ArrowLeft, ChevronDown, ChevronUp, CloudOff, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import ExerciseCard from '../components/ExerciseCard'
import RunningSessionPanel from '../components/RunningSessionPanel'
import SmartExecutionPanel from '../components/SmartExecutionPanel'
import { supabase } from '../lib/supabaseClient'
import { calculatePaceSecondsPerKm, getElapsedSeconds, resetTimer } from '../lib/runningSession'
import { getProfile } from '../services/profileService'
import { getWorkoutPlan } from '../services/planService'
import { calculateProgramSuggestion, getRecentProgramExposures, saveProgramExposure } from '../services/programExecutionService'
import { saveWorkoutSessionV2 } from '../services/workoutCompletionV2Service'
import {
  createWorkoutDraftIdentity,
  isWorkoutDraftExpired,
  loadLocalWorkoutDraft,
  purgeExpiredWorkoutDrafts,
  removeLocalWorkoutDraft,
  saveLocalWorkoutDraft
} from '../services/workoutDraftLocalService'
import { removeRemoteWorkoutDraft, upsertRemoteWorkoutDraft } from '../services/workoutDraftService'
import { getExerciseRecords } from '../services/workoutService'
import { addPendingWorkout, isOnline } from '../utils/storage'
import { friendlyError, sanitizeText } from '../utils/validation'
import { toLocalDateKey } from '../utils/date'

const today = () => toLocalDateKey()
const emptyRunning = () => ({ mode: 'manual', distanceMeters: 0, durationSeconds: 0, averagePaceSecondsPerKm: null, timer: resetTimer(), gpsStatus: 'idle', status: 'idle' })

function resolveExerciseRecord(exercise, selectedName, records) {
  const exact = records[selectedName]
  if (exact && Number(exact.last_weight || 0) > 0) return { ...exact, matched_name: selectedName, exact_match: true }
  const candidates = [exercise.name, ...(exercise.alternatives || [])]
    .map((name) => records[name])
    .filter((record) => record && Number(record.last_weight || 0) > 0)
    .sort((a, b) => String(b.last_date || '').localeCompare(String(a.last_date || '')))
  return candidates.length ? { ...candidates[0], matched_name: candidates[0].exercise_name, exact_match: false } : null
}

function buildInitialExerciseValues(workout) {
  const initial = {}
  workout.exercises.forEach((exercise) => {
    initial[exercise.id] = {
      weight: '', actualReps: '', setReps: Array(Number(exercise.sets || 0)).fill(''), rpe: '',
      progressionAccepted: null, notes: '', completed: false,
      completedSets: Array(Number(exercise.sets || 0)).fill(false), difficulty: 'normal',
      selectedName: exercise.name, expanded: true, detailsOpen: false, restTimerKey: null
    }
  })
  return initial
}

function createPlanFingerprint(workout, type) {
  return [type, ...(workout.exercises || []).map((item) => `${item.programExerciseId || item.id}:${item.name}:${item.sets}`)].join('|').slice(0, 160)
}

function mergeDraftExercises(workout, saved = {}) {
  const initial = buildInitialExerciseValues(workout)
  for (const exercise of workout.exercises) {
    const stableKeys = [exercise.programExerciseId, exercise.id].filter(Boolean).map(String)
    const candidate = stableKeys.map((key) => saved[key]).find(Boolean)
      || Object.values(saved).find((item) => item?.originalName === exercise.name)
    if (!candidate) continue
    initial[exercise.id] = { ...initial[exercise.id], ...candidate, originalName: exercise.name }
  }
  return initial
}

export default function Workout() {
  const { profileId, type } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [workout, setWorkout] = useState(null)
  const [records, setRecords] = useState({})
  const [userId, setUserId] = useState(null)
  const [gymName, setGymName] = useState('')
  const [date, setDate] = useState(today())
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [notes, setNotes] = useState('')
  const [exerciseValues, setExerciseValues] = useState({})
  const [running, setRunning] = useState(emptyRunning())
  const [draft, setDraft] = useState(null)
  const [draftStatus, setDraftStatus] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const initializedRef = useRef(false)
  const [online, setOnline] = useState(isOnline())
  const [showDetails, setShowDetails] = useState(false)

  const enrollmentId = workout?.enrollment?.id || workout?.enrollment?.enrollment_id || null
  const planFingerprint = useMemo(() => workout ? createPlanFingerprint(workout, type) : null, [workout, type])

  useEffect(() => {
    const handle = () => setOnline(isOnline())
    window.addEventListener('online', handle); window.addEventListener('offline', handle)
    return () => { window.removeEventListener('online', handle); window.removeEventListener('offline', handle) }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null)).catch(() => setMessage('Faça login novamente para continuar.'))
    getProfile(profileId).then(async (value) => { setProfile(value); setWorkout(await getWorkoutPlan(value, type)) }).catch((error) => setMessage(friendlyError(error)))
  }, [profileId, type])

  useEffect(() => {
    if (!workout || !userId || initializedRef.current) return
    initializedRef.current = true
    purgeExpiredWorkoutDrafts({ userId })
    const identity = { userId, profileId, workoutType: type, programEnrollmentId: enrollmentId || 'none' }
    const saved = loadLocalWorkoutDraft(identity)
    const baseExercises = buildInitialExerciseValues(workout)

    if (saved && !isWorkoutDraftExpired(saved)) {
      const payload = saved.payload || {}
      setGymName(payload.gymName || '')
      setDate(payload.date || today())
      setDurationMinutes(String(payload.durationMinutes ?? '60'))
      setNotes(payload.notes || '')
      setExerciseValues(mergeDraftExercises(workout, payload.exerciseValues || {}))
      setRunning({ ...emptyRunning(), ...(payload.running || {}) })
      setDraft(saved)
      setDraftStatus('Rascunho restaurado deste dispositivo.')
    } else {
      setExerciseValues(baseExercises)
      setDraft(createWorkoutDraftIdentity({ userId, profileId, workoutType: type, programEnrollmentId: enrollmentId, planFingerprint }))
    }

    getExerciseRecords(profileId, workout.exercises.flatMap((exercise) => [exercise.name, ...(exercise.alternatives || [])])).then(setRecords).catch(() => undefined)
  }, [workout, userId, profileId, type, enrollmentId, planFingerprint])

  function draftPayload(nextExercises = exerciseValues, nextRunning = running) {
    return { gymName, date, durationMinutes, notes, exerciseValues: nextExercises, running: nextRunning }
  }

  function persistLocal(nextExercises = exerciseValues, nextRunning = running) {
    if (!draft) return null
    try {
      const next = saveLocalWorkoutDraft({ ...draft, planFingerprint, payload: draftPayload(nextExercises, nextRunning) })
      setDraft(next)
      setDraftStatus('Salvo neste dispositivo.')
      return next
    } catch (error) {
      setDraftStatus(friendlyError(error))
      return null
    }
  }

  async function syncImportant(nextExercises = exerciseValues, nextRunning = running) {
    const local = persistLocal(nextExercises, nextRunning)
    if (!local || !online) return
    try {
      const remote = await upsertRemoteWorkoutDraft(local, draft?.remoteVersion ?? null)
      setDraft((current) => ({ ...current, remoteVersion: remote.version, version: remote.version }))
      setDraftStatus('Rascunho sincronizado.')
    } catch (error) {
      setDraftStatus(error?.code === 'DRAFT_CONFLICT' ? 'Há uma versão mais recente em outro dispositivo.' : 'Salvo no aparelho; sincronização pendente.')
    }
  }

  function updateExercise(id, value) {
    const previous = exerciseValues[id]
    const next = { ...exerciseValues, [id]: { ...value, originalName: workout.exercises.find((item) => item.id === id)?.name } }
    setExerciseValues(next)
    persistLocal(next, running)
    if (!previous?.completed && value.completed) syncImportant(next, running)
  }

  function updateRunning(nextRunning, important = false) {
    const durationSeconds = nextRunning.timer?.status === 'running'
      ? getElapsedSeconds(nextRunning.timer)
      : Number(nextRunning.durationSeconds || nextRunning.timer?.accumulatedSeconds || 0)
    const normalized = {
      ...nextRunning,
      durationSeconds,
      averagePaceSecondsPerKm: calculatePaceSecondsPerKm(nextRunning.distanceMeters, durationSeconds)
    }
    setRunning(normalized)
    persistLocal(exerciseValues, normalized)
    if (important) syncImportant(exerciseValues, normalized)
  }

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
      const local = persistLocal()
      const exercises = workout.exercises.map((exercise) => {
        const values = exerciseValues[exercise.id] || {}
        return { ...exercise, ...values, name: values.selectedName || exercise.name, originalName: exercise.name }
      })
      const payload = { profileId, workoutType: type, date, gymName: sanitizeText(gymName, 80), durationMinutes, notes, exercises, draftId: local?.draftId || draft?.draftId, running: type === 'E' ? running : null }
      if (!isOnline()) {
        addPendingWorkout(payload, userId)
        setMessage('Você está offline. Treino salvo no aparelho e será sincronizado quando a internet voltar.')
        setTimeout(() => navigate(`/dashboard/${profileId}`), 900)
        return
      }
      const savedSession = await saveWorkoutSessionV2(payload)
      if (workout.enrollment || workout.exercises.some((exercise) => exercise.programExerciseId)) {
        await Promise.all(workout.exercises.map((exercise) => buildProgramExposure(exercise, exerciseValues[exercise.id] || {}, savedSession?.id || null)))
      }
      if (local?.draftId || draft?.draftId) {
        const identity = { userId, profileId, workoutType: type, programEnrollmentId: enrollmentId || 'none' }
        removeLocalWorkoutDraft(identity)
        await removeRemoteWorkoutDraft({ draftId: local?.draftId || draft?.draftId, profileId }).catch(() => undefined)
      }
      setMessage('Treino salvo com sucesso.')
      setTimeout(() => navigate(`/dashboard/${profileId}`), 700)
    } catch (error) {
      setMessage(friendlyError(error))
      setDraftStatus('Falha ao finalizar; rascunho preservado.')
    } finally {
      savingRef.current = false; setSaving(false)
    }
  }

  if (!profile || !workout) return <p className="text-[#8E8E93]">Carregando treino...</p>
  const done = Object.values(exerciseValues).filter((item) => item.completed).length
  const total = workout.exercises.length
  const pendingExercises = workout.exercises.filter((exercise) => !exerciseValues[exercise.id]?.completed)
  const completedExercises = workout.exercises.filter((exercise) => exerciseValues[exercise.id]?.completed)

  const renderExercise = (exercise) => {
    const value = exerciseValues[exercise.id] || {}
    const selectedName = value.selectedName || exercise.name
    const record = resolveExerciseRecord(exercise, selectedName, records)
    return (
      <div key={exercise.id}>
        <ExerciseCard exercise={exercise} value={value} record={record} onChange={(nextValue) => updateExercise(exercise.id, nextValue)} />
        {exercise.programExerciseId && value.detailsOpen === true && <SmartExecutionPanel exercise={exercise} value={value} onChange={(nextValue) => updateExercise(exercise.id, nextValue)} />}
      </div>
    )
  }

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
        {draftStatus && <p className="mt-3 text-xs text-[#8E8E93]" role="status">{draftStatus}</p>}
      </header>

      {type === 'E' && <RunningSessionPanel value={running} onChange={(next) => updateRunning(next, false)} onImportantEvent={(next) => updateRunning(next, true)} />}

      <button type="button" onClick={() => setShowDetails((current) => !current)} className="mb-3 flex w-full items-center justify-between border-y border-[#2A2A2E] py-3 text-left text-sm font-semibold text-[#F5F5F7]">
        Detalhes do treino {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} className="text-[#8E8E93]" />}
      </button>
      {showDetails && (
        <div className="mb-6 grid gap-3 bg-[#141416] p-4 md:grid-cols-3">
          <label><span className="mb-1 block text-xs text-[#8E8E93]">Academia</span><input value={gymName} onChange={(event) => { setGymName(event.target.value); persistLocal() }} maxLength={80} placeholder="Ex: Smart Fit Centro" /></label>
          <label><span className="mb-1 block text-xs text-[#8E8E93]">Data</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); persistLocal() }} /></label>
          <label><span className="mb-1 block text-xs text-[#8E8E93]">Duração</span><input type="number" min="0" value={durationMinutes} onChange={(event) => { setDurationMinutes(event.target.value); persistLocal() }} /></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-[#8E8E93]">Observação geral</span><textarea rows="2" maxLength={500} value={notes} onChange={(event) => { setNotes(event.target.value); persistLocal() }} placeholder="Como foi o treino?" /></label>
        </div>
      )}

      <section>{pendingExercises.map(renderExercise)}</section>
      {completedExercises.length > 0 && <section className="mt-8"><h2 className="mb-2 text-lg font-semibold text-[#F5F5F7]">Concluídos</h2>{completedExercises.map(renderExercise)}</section>}
      {message && <p className="mt-4 border border-[#2A2A2E] bg-[#141416] p-3 text-sm text-[#F5F5F7]">{message}</p>}
      <Button onClick={finalizeWorkout} disabled={saving} className="sticky bottom-24 z-20 mt-8 w-full" icon={online ? Save : CloudOff}>{saving ? 'Salvando...' : 'Finalizar treino'}</Button>
    </div>
  )
}
