import { ArrowLeft, ChevronDown, ChevronUp, CloudOff, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import ExerciseCard from '../components/ExerciseCard'
import RunningSessionPanel from '../components/RunningSessionPanel'
import SmartExecutionPanel from '../components/SmartExecutionPanel'
import { classifyWorkoutDraftCompatibility, mapDraftExerciseValues } from '../domain/workoutDraftCompatibility'
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
import {
  getLatestRemoteWorkoutDraft,
  getRemoteWorkoutDraft,
  remoteRecordToWorkoutDraft,
  removeRemoteWorkoutDraft,
  upsertRemoteWorkoutDraft
} from '../services/workoutDraftService'
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
  const { mapped, unapplied } = mapDraftExerciseValues(workout, saved)
  for (const exercise of workout.exercises) {
    const candidate = mapped[exercise.id]
    if (!candidate) continue
    initial[exercise.id] = { ...initial[exercise.id], ...candidate, originalName: exercise.name }
  }
  return { values: initial, unapplied }
}

function isRemoteNewer(localDraft, remoteDraft) {
  if (!remoteDraft) return false
  if (!localDraft) return true
  if (remoteDraft.draftId !== localDraft.draftId) return true
  const localVersion = Number(localDraft.remoteVersion || localDraft.version || 0)
  if (Number(remoteDraft.version || 0) > localVersion) return true
  return Date.parse(remoteDraft.updatedAt || '') > Date.parse(localDraft.updatedAt || '')
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
  const [pendingPlanDraft, setPendingPlanDraft] = useState(null)
  const [pendingRemoteDraft, setPendingRemoteDraft] = useState(null)
  const [draftStatus, setDraftStatus] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const initializationKeyRef = useRef(null)
  const [online, setOnline] = useState(isOnline())
  const [showDetails, setShowDetails] = useState(false)

  const enrollmentId = workout?.enrollment?.id || workout?.enrollment?.enrollment_id || null
  const planFingerprint = useMemo(() => workout ? createPlanFingerprint(workout, type) : null, [workout, type])
  const draftIdentity = useMemo(() => userId ? ({ userId, profileId, workoutType: type, programEnrollmentId: enrollmentId || 'none' }) : null, [userId, profileId, type, enrollmentId])

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
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null)).catch(() => setMessage('Faça login novamente para continuar.'))
    getProfile(profileId).then(async (value) => {
      setProfile(value)
      setWorkout(await getWorkoutPlan(value, type))
    }).catch((error) => setMessage(friendlyError(error)))
  }, [profileId, type])

  function applyDraftSnapshot(saved, status) {
    const compatibility = classifyWorkoutDraftCompatibility(saved, planFingerprint)
    if (!compatibility.canRestoreAutomatically) {
      setExerciseValues(buildInitialExerciseValues(workout))
      setRunning(emptyRunning())
      setPendingPlanDraft(saved)
      setDraft(createWorkoutDraftIdentity({ userId, profileId, workoutType: type, programEnrollmentId: enrollmentId, planFingerprint }))
      setDraftStatus('O plano mudou desde o último acesso. Escolha como tratar o rascunho anterior.')
      return
    }

    const payload = saved.payload || {}
    const restored = mergeDraftExercises(workout, payload.exerciseValues || {})
    setGymName(payload.gymName || '')
    setDate(payload.date || today())
    setDurationMinutes(String(payload.durationMinutes ?? '60'))
    setNotes(payload.notes || '')
    setExerciseValues(restored.values)
    setRunning({ ...emptyRunning(), ...(payload.running || {}) })
    setDraft(saved)
    setPendingPlanDraft(null)
    setDraftStatus(restored.unapplied.length ? `${status} ${restored.unapplied.length} item(ns) não aplicado(s).` : status)
  }

  useEffect(() => {
    if (!workout || !userId || !draftIdentity) return undefined
    const initializationKey = `${userId}:${profileId}:${type}:${enrollmentId || 'none'}:${planFingerprint}`
    if (initializationKeyRef.current === initializationKey) return undefined
    initializationKeyRef.current = initializationKey
    let cancelled = false

    async function initializeDraft() {
      purgeExpiredWorkoutDrafts({ userId })
      const saved = loadLocalWorkoutDraft(draftIdentity)
      const localDraft = saved && !isWorkoutDraftExpired(saved) ? saved : null
      const freshDraft = createWorkoutDraftIdentity({ userId, profileId, workoutType: type, programEnrollmentId: enrollmentId, planFingerprint })
      let remoteDraft = null

      if (isOnline()) {
        try {
          const remoteRecord = await getLatestRemoteWorkoutDraft({ profileId, workoutType: type, programEnrollmentId: enrollmentId })
          remoteDraft = remoteRecordToWorkoutDraft(remoteRecord)
        } catch {
          setDraftStatus('Não foi possível verificar outros dispositivos. O rascunho local continua protegido.')
        }
      }
      if (cancelled) return

      if (remoteDraft && isRemoteNewer(localDraft, remoteDraft)) {
        setExerciseValues(buildInitialExerciseValues(workout))
        setRunning(emptyRunning())
        setDraft(localDraft || freshDraft)
        setPendingRemoteDraft({ remote: remoteDraft, local: localDraft || freshDraft })
        setDraftStatus('Existe um treino mais recente em outro dispositivo. Escolha qual versão continuar.')
      } else if (localDraft) {
        const reconciled = remoteDraft && remoteDraft.draftId === localDraft.draftId
          ? { ...localDraft, remoteVersion: remoteDraft.version, version: remoteDraft.version }
          : localDraft
        applyDraftSnapshot(reconciled, 'Rascunho restaurado deste dispositivo.')
      } else {
        setExerciseValues(buildInitialExerciseValues(workout))
        setDraft(freshDraft)
        setPendingPlanDraft(null)
        setPendingRemoteDraft(null)
      }

      getExerciseRecords(profileId, workout.exercises.flatMap((exercise) => [exercise.name, ...(exercise.alternatives || [])])).then(setRecords).catch(() => undefined)
    }

    initializeDraft()
    return () => { cancelled = true }
  }, [workout, userId, profileId, type, enrollmentId, planFingerprint, draftIdentity])

  function openRemoteDraft() {
    if (!pendingRemoteDraft) return
    const remote = pendingRemoteDraft.remote
    saveLocalWorkoutDraft(remote)
    setPendingRemoteDraft(null)
    applyDraftSnapshot(remote, 'Versão mais recente do outro dispositivo restaurada.')
  }

  function continueThisDevice() {
    if (!pendingRemoteDraft) return
    const { remote, local } = pendingRemoteDraft
    const adopted = saveLocalWorkoutDraft({
      ...local,
      draftId: remote.draftId,
      remoteVersion: remote.version,
      version: remote.version,
      createdAt: remote.createdAt,
      planFingerprint
    })
    setDraft(adopted)
    setPendingRemoteDraft(null)
    setDraftStatus('Esta versão foi escolhida. A próxima sincronização substituirá a versão remota com controle de conflito.')
  }

  function applyChangedPlanDraft() {
    if (!pendingPlanDraft) return
    const payload = pendingPlanDraft.payload || {}
    const restored = mergeDraftExercises(workout, payload.exerciseValues || {})
    setGymName(payload.gymName || '')
    setDate(payload.date || today())
    setDurationMinutes(String(payload.durationMinutes ?? '60'))
    setNotes(payload.notes || '')
    setExerciseValues(restored.values)
    setRunning({ ...emptyRunning(), ...(payload.running || {}) })
    setDraft({ ...pendingPlanDraft, planFingerprint })
    setPendingPlanDraft(null)
    setDraftStatus(restored.unapplied.length ? `Plano atualizado. ${restored.unapplied.length} item(ns) antigo(s) não foram aplicados automaticamente.` : 'Rascunho compatível restaurado no plano atualizado.')
  }

  function discardChangedPlanDraft() {
    if (draftIdentity) removeLocalWorkoutDraft(draftIdentity)
    setPendingPlanDraft(null)
    setExerciseValues(buildInitialExerciseValues(workout))
    setRunning(emptyRunning())
    setGymName('')
    setDate(today())
    setDurationMinutes('60')
    setNotes('')
    setDraft(createWorkoutDraftIdentity({ userId, profileId, workoutType: type, programEnrollmentId: enrollmentId, planFingerprint }))
    setDraftStatus('Rascunho anterior descartado neste dispositivo.')
  }

  function draftPayload(nextExercises = exerciseValues, nextRunning = running, overrides = {}) {
    return { gymName, date, durationMinutes, notes, exerciseValues: nextExercises, running: nextRunning, ...overrides }
  }

  function persistLocal(nextExercises = exerciseValues, nextRunning = running, overrides = {}) {
    if (!draft || pendingPlanDraft || pendingRemoteDraft) return null
    try {
      const next = saveLocalWorkoutDraft({ ...draft, planFingerprint, payload: draftPayload(nextExercises, nextRunning, overrides) })
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
      const remote = await upsertRemoteWorkoutDraft(local, local.remoteVersion ?? null)
      const synced = saveLocalWorkoutDraft({
        ...local,
        remoteVersion: remote.version,
        version: remote.version
      })
      setDraft(synced)
      setDraftStatus('Rascunho sincronizado.')
    } catch (error) {
      if (error?.code === 'DRAFT_CONFLICT') {
        try {
          const remoteRecord = await getRemoteWorkoutDraft({ draftId: local.draftId, profileId })
          const remote = remoteRecordToWorkoutDraft(remoteRecord)
          if (remote) setPendingRemoteDraft({ remote, local })
        } catch {
          // O rascunho local permanece íntegro mesmo se a leitura remota falhar.
        }
        setDraftStatus('Há uma versão mais recente em outro dispositivo. Escolha qual versão continuar.')
      } else {
        setDraftStatus('Salvo no aparelho; sincronização pendente.')
      }
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
    for (const item of recent) {
      if (item.progression_action === 'increase') break
      previousFailures += 1
    }
    const suggestion = calculateProgramSuggestion(exercise, values, previousFailures)
    await saveProgramExposure({ profileId, workoutSessionId, exercise, value: values, suggestion })
  }

  async function finalizeWorkout() {
    if (savingRef.current || pendingPlanDraft || pendingRemoteDraft) return
    savingRef.current = true
    setSaving(true)
    setMessage('')
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
        removeLocalWorkoutDraft(draftIdentity)
        await removeRemoteWorkoutDraft({ draftId: local?.draftId || draft?.draftId, profileId }).catch(() => undefined)
      }
      setMessage('Treino salvo com sucesso.')
      setTimeout(() => navigate(`/dashboard/${profileId}`), 700)
    } catch (error) {
      setMessage(friendlyError(error))
      setDraftStatus('Falha ao finalizar; rascunho preservado.')
    } finally {
      savingRef.current = false
      setSaving(false)
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

      {pendingRemoteDraft && (
        <section className="mb-6 border border-amber-400/40 bg-amber-400/10 p-4" role="alert">
          <h2 className="font-semibold text-[#F5F5F7]">Treino em andamento em outro dispositivo</h2>
          <p className="mt-2 text-sm text-[#C5C5CA]">Nenhuma versão será substituída automaticamente. Abra a versão mais recente ou continue com os dados deste dispositivo.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={openRemoteDraft} className="rounded-lg bg-[#C8FF3D] px-4 py-2 text-sm font-semibold text-[#0A0A0B]">Abrir versão mais recente</button>
            <button type="button" onClick={continueThisDevice} className="rounded-lg border border-[#3A3A40] px-4 py-2 text-sm font-semibold text-[#F5F5F7]">Continuar neste dispositivo</button>
          </div>
        </section>
      )}

      {pendingPlanDraft && (
        <section className="mb-6 border border-amber-400/40 bg-amber-400/10 p-4" role="alert">
          <h2 className="font-semibold text-[#F5F5F7]">O plano deste treino foi alterado</h2>
          <p className="mt-2 text-sm text-[#C5C5CA]">Podemos aplicar apenas exercícios identificados com segurança. Dados de exercícios removidos não serão transferidos automaticamente.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={applyChangedPlanDraft} className="rounded-lg bg-[#C8FF3D] px-4 py-2 text-sm font-semibold text-[#0A0A0B]">Aplicar dados compatíveis</button>
            <button type="button" onClick={discardChangedPlanDraft} className="rounded-lg border border-[#3A3A40] px-4 py-2 text-sm font-semibold text-[#F5F5F7]">Descartar rascunho</button>
          </div>
        </section>
      )}

      {type === 'E' && <RunningSessionPanel value={running} onChange={(next) => updateRunning(next, false)} onImportantEvent={(next) => updateRunning(next, true)} />}

      <button type="button" onClick={() => setShowDetails((current) => !current)} className="mb-3 flex w-full items-center justify-between border-y border-[#2A2A2E] py-3 text-left text-sm font-semibold text-[#F5F5F7]">
        Detalhes do treino {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} className="text-[#8E8E93]" />}
      </button>
      {showDetails && (
        <div className="mb-6 grid gap-3 bg-[#141416] p-4 md:grid-cols-3">
          <label><span className="mb-1 block text-xs text-[#8E8E93]">Academia</span><input value={gymName} onChange={(event) => { const value = event.target.value; setGymName(value); persistLocal(exerciseValues, running, { gymName: value }) }} maxLength={80} placeholder="Ex: Smart Fit Centro" /></label>
          <label><span className="mb-1 block text-xs text-[#8E8E93]">Data</span><input type="date" value={date} onChange={(event) => { const value = event.target.value; setDate(value); persistLocal(exerciseValues, running, { date: value }) }} /></label>
          <label><span className="mb-1 block text-xs text-[#8E8E93]">Duração</span><input type="number" min="0" value={durationMinutes} onChange={(event) => { const value = event.target.value; setDurationMinutes(value); persistLocal(exerciseValues, running, { durationMinutes: value }) }} /></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-[#8E8E93]">Observação geral</span><textarea rows="2" maxLength={500} value={notes} onChange={(event) => { const value = event.target.value; setNotes(value); persistLocal(exerciseValues, running, { notes: value }) }} placeholder="Como foi o treino?" /></label>
        </div>
      )}

      <section>{pendingExercises.map(renderExercise)}</section>
      {completedExercises.length > 0 && <section className="mt-8"><h2 className="mb-2 text-lg font-semibold text-[#F5F5F7]">Concluídos</h2>{completedExercises.map(renderExercise)}</section>}
      {message && <p className="mt-4 border border-[#2A2A2E] bg-[#141416] p-3 text-sm text-[#F5F5F7]">{message}</p>}
      <Button onClick={finalizeWorkout} disabled={saving || Boolean(pendingPlanDraft) || Boolean(pendingRemoteDraft)} className="sticky bottom-24 z-20 mt-8 w-full" icon={online ? Save : CloudOff}>{saving ? 'Salvando...' : 'Finalizar treino'}</Button>
    </div>
  )
}
