import { supabase } from '../lib/supabaseClient'
import { logger, createRequestId } from '../lib/observability/logger'
import { calculateVolume } from '../utils/progression'
import { parsePositiveNumber, sanitizeText, validateWorkoutInput } from '../utils/validation'

function normalizeExercise(item) {
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

export async function saveWorkoutSessionV2({
  profileId,
  workoutType,
  date,
  gymName,
  durationMinutes,
  notes,
  exercises,
  draftId = null,
  running = null
}) {
  const requestId = createRequestId()
  const cleanWorkout = validateWorkoutInput({ gymName, durationMinutes, notes })
  const cleanExercises = exercises.map(normalizeExercise)
  const completedCount = cleanExercises.filter((item) => item.completed).length
  const completionPercentage = cleanExercises.length
    ? Math.round((completedCount / cleanExercises.length) * 100)
    : 0
  const totalVolume = calculateVolume(cleanExercises.map((item) => ({ ...item, name: item.exercise_name })))
  const distanceMeters = running?.distanceMeters > 0 ? Math.round(Number(running.distanceMeters)) : null
  const durationSeconds = running?.durationSeconds > 0 ? Math.round(Number(running.durationSeconds)) : null
  const pace = running?.averagePaceSecondsPerKm > 0 ? Math.round(Number(running.averagePaceSecondsPerKm)) : null
  const activityMode = ['manual', 'stopwatch', 'gps'].includes(running?.mode) ? running.mode : null

  const { data, error } = await supabase.rpc('save_workout_session_v2', {
    p_profile_id: profileId,
    p_workout_code: workoutType,
    p_workout_date: date,
    p_gym_name: cleanWorkout.gymName,
    p_duration_minutes: cleanWorkout.durationMinutes,
    p_completion_percentage: completionPercentage,
    p_total_volume: totalVolume,
    p_notes: cleanWorkout.notes || null,
    p_exercises: cleanExercises,
    p_source_draft_id: draftId,
    p_distance_meters: distanceMeters,
    p_duration_seconds: durationSeconds,
    p_average_pace_seconds_per_km: pace,
    p_activity_mode: activityMode
  })

  if (error) {
    logger.error('workout.save_v2_failed', { requestId, profileId, workoutType, draftId, error })
    throw error
  }
  logger.info('workout.save_v2_succeeded', { requestId, profileId, workoutType, draftId, sessionId: data?.id })
  return data
}
