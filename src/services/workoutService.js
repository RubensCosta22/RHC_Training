import { supabase } from '../lib/supabaseClient'
import { logger, createRequestId } from '../lib/observability/logger'
import { calculateVolume, getProgressionStatus } from '../utils/progression'
import { getPendingWorkouts, replacePendingWorkouts } from '../utils/storage'
import { sanitizeText, validateWorkoutInput, parsePositiveNumber } from '../utils/validation'
import { parseLocalDate, toLocalDateKey } from '../utils/date'

let pendingSyncPromise = null

function normalizeExerciseForDb(item) {
  return {
    exercise_name: sanitizeText(item.name || item.exercise_name, 120),
    muscle_group: sanitizeText(item.muscleGroup || item.muscle_group, 80),
    sets: Number(item.sets || 0),
    reps: sanitizeText(item.reps || '', 40),
    actual_reps: sanitizeText(item.actualReps || item.actual_reps || '', 40),
    weight: parsePositiveNumber(item.weight || 0, 'Carga') || 0,
    completed: Boolean(item.completed),
    notes: sanitizeText(item.notes || '', 500)
  }
}

export async function getExerciseRecords(profileId, exerciseNames = []) {
  let query = supabase
    .from('exercise_records')
    .select('*')
    .eq('profile_id', profileId)

  if (exerciseNames.length) {
    query = query.in('exercise_name', exerciseNames)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).reduce((acc, record) => {
    acc[record.exercise_name] = record
    return acc
  }, {})
}

async function detectPersonalRecords(profileId, exercises) {
  const completedExercises = exercises.filter((item) => item.completed)

  if (!completedExercises.length) return []

  const existing = await getExerciseRecords(
    profileId,
    completedExercises.map((item) => item.exercise_name)
  )

  return completedExercises
    .filter((item) => {
      const currentWeight = Number(item.weight || 0)
      const previousBest = Number(existing[item.exercise_name]?.best_weight || 0)

      return currentWeight > 0 && currentWeight > previousBest
    })
    .map((item) => {
      const previousBest = Number(existing[item.exercise_name]?.best_weight || 0)

      return {
        exerciseName: item.exercise_name,
        previousBest,
        newBest: Number(item.weight || 0)
      }
    })
}

export async function saveWorkoutSession({
  profileId,
  workoutType,
  date,
  gymName,
  durationMinutes,
  notes,
  exercises
}) {
  const requestId = createRequestId()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    logger.error('workout.save_auth_failed', {
      requestId,
      profileId,
      action: 'workout.save',
      error: userError
    })
    throw userError
  }

  const userId = userData.user?.id

  if (!userId) {
    logger.warn('workout.save_user_missing', {
      requestId,
      profileId,
      action: 'workout.save'
    })
    throw new Error('Faça login novamente para salvar o treino.')
  }

  try {
    const cleanWorkout = validateWorkoutInput({
      gymName,
      durationMinutes,
      notes
    })

    const cleanExercises = exercises.map(normalizeExerciseForDb)
    const personalRecords = await detectPersonalRecords(profileId, cleanExercises)
    const completedCount = cleanExercises.filter((item) => item.completed).length

    const completionPercentage = cleanExercises.length
      ? Math.round((completedCount / cleanExercises.length) * 100)
      : 0

    const totalVolume = calculateVolume(
      cleanExercises.map((item) => ({
        ...item,
        name: item.exercise_name
      }))
    )

    const { data: session, error: sessionError } = await supabase.rpc(
      'save_family_workout_session_atomic',
      {
        p_profile_id: profileId,
        p_workout_type: workoutType,
        p_date: date,
        p_gym_name: cleanWorkout.gymName,
        p_duration_minutes: cleanWorkout.durationMinutes,
        p_completion_percentage: completionPercentage,
        p_total_volume: totalVolume,
        p_notes: cleanWorkout.notes || null,
        p_exercises: cleanExercises
      }
    )

    if (sessionError) throw sessionError

    logger.info('workout.save_succeeded', {
      requestId,
      userId,
      profileId,
      action: 'workout.save',
      workoutType,
      completedCount,
      exerciseCount: cleanExercises.length,
      personalRecordCount: personalRecords.length
    })

    return {
      ...session,
      personalRecords
    }
  } catch (error) {
    logger.error('workout.save_failed', {
      requestId,
      userId,
      profileId,
      action: 'workout.save',
      workoutType,
      error
    })
    throw error
  }
}

export async function getWorkoutSessions(profileId, filters = {}) {
  let query = supabase
    .from('workout_sessions')
    .select('*, workout_exercises(*)')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.type) {
    query = query.eq('workout_type', filters.type)
  }

  if (filters.gymName) {
    query = query.ilike(
      'gym_name',
      `%${sanitizeText(filters.gymName, 80)}%`
    )
  }

  if (filters.from) {
    query = query.gte('date', filters.from)
  }

  if (filters.to) {
    query = query.lte('date', filters.to)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

export async function getDashboardSummary(profileId) {
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const normalized = sessions || []
  const lastWorkout = normalized[0]

  const weekCount = normalized.filter((session) => {
    return parseLocalDate(session.date) >= startOfWeek
  }).length

  const monthCount = normalized.filter((session) => {
    return parseLocalDate(session.date) >= startOfMonth
  }).length

  const totalVolume = normalized.reduce((acc, session) => {
    return acc + Number(session.total_volume || 0)
  }, 0)

  const streak = calculateStreak(normalized.map((session) => session.date))
  const bestStreak = calculateBestStreak(normalized.map((session) => session.date))

  const { data: lastMeasurement, error: lastMeasurementError } = await supabase
    .from('body_measurements')
    .select('weight,date')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastMeasurementError) {
    logger.warn('dashboard.last_measurement_load_failed', {
      requestId: createRequestId(),
      profileId,
      action: 'dashboard.load_last_measurement',
      error: lastMeasurementError
    })
  }

  return {
    lastWorkout,
    weekCount,
    monthCount,
    totalVolume,
    currentStreak: streak,
    bestStreak,
    lastMeasurement
  }
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
    } else {
      break
    }
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
    } else {
      current = 1
    }
  }

  return best
}

export async function getProgressData(profileId) {
  const sessions = await getWorkoutSessions(profileId)
  const chronologicalSessions = [...sessions].reverse()

  const { data: measurements, error: measurementsError } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('date', { ascending: true })

  if (measurementsError) throw measurementsError

  const exercises = chronologicalSessions.flatMap((session) =>
    (session.workout_exercises || []).filter((exercise) => exercise.completed).map((exercise) => ({
      date: session.date,
      workout_type: session.workout_type,
      exercise_name: exercise.exercise_name,
      weight: Number(exercise.weight || 0),
      volume: calculateVolume([
        {
          ...exercise,
          completed: true
        }
      ]),
      progression: getProgressionStatus(exercise.weight, null)
    }))
  )

  return {
    sessions: chronologicalSessions,
    measurements: measurements || [],
    exercises
  }
}

async function runPendingWorkoutSync() {
  const requestId = createRequestId()
  const pending = getPendingWorkouts()

  if (!pending.length || !navigator.onLine) {
    return {
      synced: 0,
      remaining: pending.length
    }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    logger.error('offline_sync.auth_failed', {
      requestId,
      action: 'offline_sync',
      pendingCount: pending.length,
      error: userError
    })
    throw userError
  }

  const userId = userData.user?.id
  if (!userId) {
    logger.warn('offline_sync.user_missing', {
      requestId,
      action: 'offline_sync',
      pendingCount: pending.length
    })
    return { synced: 0, remaining: pending.length }
  }

  const remaining = []
  let synced = 0

  for (const item of pending) {
    if (!item.ownerUserId || item.ownerUserId !== userId) {
      logger.warn('offline_sync.owner_mismatch', {
        requestId,
        userId,
        action: 'offline_sync',
        offlineId: item.offlineId || undefined
      })
      remaining.push(item)
      continue
    }

    try {
      const { ownerUserId: _ownerUserId, offlineId: _offlineId, ...payload } = item
      await saveWorkoutSession(payload)
      synced += 1
    } catch (error) {
      logger.warn('offline_sync.item_failed', {
        requestId,
        userId,
        profileId: item.profileId,
        action: 'offline_sync',
        offlineId: item.offlineId || undefined,
        error
      })
      remaining.push(item)
    }
  }

  replacePendingWorkouts(remaining)

  logger.info('offline_sync.completed', {
    requestId,
    userId,
    action: 'offline_sync',
    pendingCount: pending.length,
    synced,
    remaining: remaining.length
  })

  return {
    synced,
    remaining: remaining.length
  }
}

export function syncPendingWorkouts() {
  if (pendingSyncPromise) return pendingSyncPromise

  pendingSyncPromise = runPendingWorkoutSync()
    .finally(() => {
      pendingSyncPromise = null
    })

  return pendingSyncPromise
}

export async function archiveWorkoutSession(sessionId) {
  const requestId = createRequestId()
  const { error } = await supabase
    .from('workout_sessions')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) {
    logger.error('workout.archive_failed', {
      requestId,
      action: 'workout.archive',
      sessionId,
      error
    })
    throw error
  }

  logger.info('workout.archive_succeeded', {
    requestId,
    action: 'workout.archive',
    sessionId
  })
}
