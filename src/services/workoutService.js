import { supabase } from '../lib/supabaseClient'
import { logger, createRequestId } from '../lib/observability/logger'
import { calculateVolume, getProgressionStatus } from '../utils/progression'
import { getPendingWorkouts, replacePendingWorkouts } from '../utils/storage'
import { parseLocalDate, toLocalDateKey } from '../utils/date'
import { saveWorkoutSessionV2 } from './workoutCompletionV2Service'

let pendingSyncPromise = null

function normalizeExerciseRow(row) {
  return {
    ...row,
    exercise_name: row.exercise_name_snapshot,
    muscle_group: row.muscle_group_snapshot,
    sets: row.prescribed_sets,
    reps: row.prescribed_reps
  }
}

function normalizeSessionRow(row) {
  if (!row) return row
  return {
    ...row,
    date: row.workout_date,
    workout_type: row.workout_code,
    workout_exercises: (row.workout_exercises || []).map(normalizeExerciseRow)
  }
}

export async function getExerciseRecords(profileId, exerciseNames = []) {
  let catalogQuery = supabase.from('exercise_catalog').select('id,name').eq('is_active', true)
  if (exerciseNames.length) {
    const names = [...new Set(exerciseNames.map((name) => String(name || '').trim()).filter(Boolean))]
    if (!names.length) return {}
    catalogQuery = catalogQuery.in('name', names)
  }
  const { data: catalog, error: catalogError } = await catalogQuery
  if (catalogError) throw catalogError
  if (!catalog?.length) return {}

  const names = new Map(catalog.map((item) => [item.id, item.name]))
  const { data: records, error } = await supabase
    .from('exercise_records')
    .select('*')
    .eq('profile_id', profileId)
    .in('exercise_id', [...names.keys()])
  if (error) throw error

  return (records || []).reduce((acc, record) => {
    const exerciseName = names.get(record.exercise_id)
    if (exerciseName) acc[exerciseName] = { ...record, exercise_name: exerciseName }
    return acc
  }, {})
}

async function detectPersonalRecords(profileId, exercises) {
  const completed = exercises.filter((item) => item.completed)
  if (!completed.length) return []
  const existing = await getExerciseRecords(profileId, completed.map((item) => item.name || item.exercise_name))
  return completed.flatMap((item) => {
    const name = item.name || item.exercise_name
    const currentWeight = Number(item.weight || 0)
    const previousBest = Number(existing[name]?.best_weight || 0)
    return currentWeight > 0 && currentWeight > previousBest
      ? [{ exerciseName: name, previousBest, newBest: currentWeight }]
      : []
  })
}

export async function saveWorkoutSession(payload) {
  const personalRecords = await detectPersonalRecords(payload.profileId, payload.exercises || [])
  const session = await saveWorkoutSessionV2(payload)
  return { ...normalizeSessionRow(session), personalRecords }
}

export async function getWorkoutSessions(profileId, filters = {}) {
  let query = supabase
    .from('workout_sessions')
    .select('*, workout_exercises(*)')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('workout_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.type) query = query.eq('workout_code', filters.type)
  if (filters.gymName) query = query.ilike('gym_name', `%${String(filters.gymName).slice(0, 80)}%`)
  if (filters.from) query = query.gte('workout_date', filters.from)
  if (filters.to) query = query.lte('workout_date', filters.to)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(normalizeSessionRow)
}

export async function getDashboardSummary(profileId) {
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('workout_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error

  const normalized = (sessions || []).map(normalizeSessionRow)
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastWorkout = normalized[0]
  const weekCount = normalized.filter((session) => parseLocalDate(session.date) >= startOfWeek).length
  const monthCount = normalized.filter((session) => parseLocalDate(session.date) >= startOfMonth).length
  const totalVolume = normalized.reduce((acc, session) => acc + Number(session.total_volume || 0), 0)
  const streak = calculateStreak(normalized.map((session) => session.date))
  const bestStreak = calculateBestStreak(normalized.map((session) => session.date))

  const { data: lastMeasurementRow, error: lastMeasurementError } = await supabase
    .from('body_measurements')
    .select('weight,measured_on')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('measured_on', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastMeasurementError) {
    logger.warn('dashboard.last_measurement_load_failed', {
      requestId: createRequestId(), profileId, action: 'dashboard.load_last_measurement', error: lastMeasurementError
    })
  }
  const lastMeasurement = lastMeasurementRow ? { ...lastMeasurementRow, date: lastMeasurementRow.measured_on } : null

  return { lastWorkout, weekCount, monthCount, totalVolume, currentStreak: streak, bestStreak, lastMeasurement }
}

function dayKey(date) {
  return toLocalDateKey(parseLocalDate(date))
}

function calculateStreak(dates) {
  const unique = [...new Set(dates.map(dayKey))].sort().reverse()
  if (!unique.length) return 0
  let streak = 0
  let cursor = new Date()
  for (const date of unique) {
    const expected = dayKey(cursor)
    const yesterday = new Date(cursor)
    yesterday.setDate(cursor.getDate() - 1)
    if (date === expected || date === dayKey(yesterday)) {
      streak += 1
      cursor = parseLocalDate(date)
      cursor.setDate(cursor.getDate() - 1)
    } else break
  }
  return streak
}

function calculateBestStreak(dates) {
  const unique = [...new Set(dates.map(dayKey))].sort()
  if (!unique.length) return 0
  let best = 1
  let current = 1
  for (let index = 1; index < unique.length; index += 1) {
    const previous = parseLocalDate(unique[index - 1])
    const actual = parseLocalDate(unique[index])
    previous.setDate(previous.getDate() + 1)
    if (dayKey(previous) === dayKey(actual)) {
      current += 1
      best = Math.max(best, current)
    } else current = 1
  }
  return best
}

export async function getProgressData(profileId) {
  const sessions = await getWorkoutSessions(profileId)
  const chronologicalSessions = [...sessions].reverse()
  const { data: measurementRows, error: measurementsError } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('measured_on', { ascending: true })
  if (measurementsError) throw measurementsError
  const measurements = (measurementRows || []).map((item) => ({ ...item, date: item.measured_on }))

  const exercises = chronologicalSessions.flatMap((session) =>
    (session.workout_exercises || []).filter((exercise) => exercise.completed).map((exercise) => ({
      date: session.date,
      workout_type: session.workout_type,
      exercise_name: exercise.exercise_name,
      weight: Number(exercise.weight || 0),
      volume: calculateVolume([{ ...exercise, completed: true }]),
      progression: getProgressionStatus(exercise.weight, null)
    }))
  )
  return { sessions: chronologicalSessions, measurements, exercises }
}

async function runPendingWorkoutSync() {
  const requestId = createRequestId()
  const pending = getPendingWorkouts()
  if (!pending.length || !navigator.onLine) return { synced: 0, remaining: pending.length }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    logger.error('offline_sync.auth_failed', { requestId, action: 'offline_sync', pendingCount: pending.length, error: userError })
    throw userError
  }
  const userId = userData.user?.id
  if (!userId) return { synced: 0, remaining: pending.length }

  const remaining = []
  let synced = 0
  for (const item of pending) {
    if (!item.ownerUserId || item.ownerUserId !== userId) {
      remaining.push(item)
      continue
    }
    try {
      const { ownerUserId: _ownerUserId, offlineId: _offlineId, ...payload } = item
      await saveWorkoutSession(payload)
      synced += 1
    } catch (error) {
      logger.warn('offline_sync.item_failed', { requestId, userId, profileId: item.profileId, action: 'offline_sync', offlineId: item.offlineId || undefined, error })
      remaining.push(item)
    }
  }
  replacePendingWorkouts(remaining)
  return { synced, remaining: remaining.length }
}

export function syncPendingWorkouts() {
  if (pendingSyncPromise) return pendingSyncPromise
  pendingSyncPromise = runPendingWorkoutSync().finally(() => { pendingSyncPromise = null })
  return pendingSyncPromise
}

export async function archiveWorkoutSession(sessionId) {
  const requestId = createRequestId()
  const { error } = await supabase
    .from('workout_sessions')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) {
    logger.error('workout.archive_failed', { requestId, action: 'workout.archive', sessionId, error })
    throw error
  }
}
