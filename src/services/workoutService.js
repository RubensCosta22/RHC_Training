import { supabase } from '../lib/supabaseClient'
import { calculateVolume, getProgressionStatus } from '../utils/progression'
import { getPendingWorkouts, replacePendingWorkouts } from '../utils/storage'
import { sanitizeText, validateWorkoutInput, parsePositiveNumber } from '../utils/validation'

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
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) throw userError

  const userId = userData.user?.id

  if (!userId) {
    throw new Error('Faça login novamente para salvar o treino.')
  }

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

  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      profile_id: profileId,
      workout_type: workoutType,
      date,
      gym_name: cleanWorkout.gymName,
      duration_minutes: cleanWorkout.durationMinutes,
      completion_percentage: completionPercentage,
      total_volume: totalVolume,
      notes: cleanWorkout.notes
    })
    .select('*')
    .single()

  if (sessionError) throw sessionError

  const exercisesPayload = cleanExercises.map((item) => ({
    ...item,
    session_id: session.id
  }))

  const { error: exercisesError } = await supabase
    .from('workout_exercises')
    .insert(exercisesPayload)

  if (exercisesError) throw exercisesError

  await updateExerciseRecords({
    userId,
    profileId,
    date,
    exercises: cleanExercises
  })

  return {
    ...session,
    personalRecords
  }
}

async function updateExerciseRecords({
  userId,
  profileId,
  date,
  exercises
}) {
  const existing = await getExerciseRecords(
    profileId,
    exercises.map((item) => item.exercise_name)
  )

  const payload = exercises
    .filter((item) => item.completed)
    .map((item) => {
      const previous = existing[item.exercise_name]

      return {
        user_id: userId,
        profile_id: profileId,
        exercise_name: item.exercise_name,
        last_weight: Number(item.weight || 0),
        best_weight: Math.max(
          Number(item.weight || 0),
          Number(previous?.best_weight || 0)
        ),
        last_date: date,
        updated_at: new Date().toISOString()
      }
    })

  if (!payload.length) return

  const { error } = await supabase
    .from('exercise_records')
    .upsert(payload, {
      onConflict: 'user_id,profile_id,exercise_name'
    })

  if (error) throw error
}

export async function getWorkoutSessions(profileId, filters = {}) {
  let query = supabase
    .from('workout_sessions')
    .select('*, workout_exercises(*)')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })

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
    .order('date', { ascending: false })

  if (error) throw error

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const normalized = sessions || []
  const lastWorkout = normalized[0]

  const weekCount = normalized.filter((session) => {
    return new Date(session.date) >= startOfWeek
  }).length

  const monthCount = normalized.filter((session) => {
    return new Date(session.date) >= startOfMonth
  }).length

  const totalVolume = normalized.reduce((acc, session) => {
    return acc + Number(session.total_volume || 0)
  }, 0)

  const streak = calculateStreak(normalized.map((session) => session.date))
  const bestStreak = calculateBestStreak(normalized.map((session) => session.date))

  const { data: lastMeasurement } = await supabase
    .from('body_measurements')
    .select('weight,date')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

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
  return new Date(date).toISOString().slice(0, 10)
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
      cursor = new Date(date)
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
    const previous = new Date(unique[index - 1])
    const actual = new Date(unique[index])

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

  const { data: measurements, error: measurementsError } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', profileId)
    .order('date', { ascending: true })

  if (measurementsError) throw measurementsError

  const exercises = sessions.flatMap((session) =>
    (session.workout_exercises || []).map((exercise) => ({
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
    sessions: sessions.reverse(),
    measurements: measurements || [],
    exercises
  }
}

export async function syncPendingWorkouts() {
  const pending = getPendingWorkouts()

  if (!pending.length || !navigator.onLine) {
    return {
      synced: 0,
      remaining: pending.length
    }
  }

  const remaining = []
  let synced = 0

  for (const item of pending) {
    try {
      await saveWorkoutSession(item)
      synced += 1
    } catch {
      remaining.push(item)
    }
  }

  replacePendingWorkouts(remaining)

  return {
    synced,
    remaining: remaining.length
  }
}