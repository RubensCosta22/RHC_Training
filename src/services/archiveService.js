import { supabase } from '../lib/supabaseClient'

async function listTable(table, profileId, select = '*') {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('profile_id', profileId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })
  if (error) throw error
  return data || []
}

function normalizeWorkout(item) {
  return {
    ...item,
    date: item.workout_date,
    workout_type: item.workout_code,
    workout_exercises: (item.workout_exercises || []).map((exercise) => ({
      ...exercise,
      exercise_name: exercise.exercise_name_snapshot,
      muscle_group: exercise.muscle_group_snapshot,
      sets: exercise.prescribed_sets,
      reps: exercise.prescribed_reps
    }))
  }
}

function normalizeMeasurement(item) {
  return { ...item, date: item.measured_on }
}

function normalizePhoto(item) {
  return { ...item, date: item.photo_date, photo_url: item.object_path }
}

export async function listArchivedItems(profileId) {
  const [workouts, measurements, photos] = await Promise.all([
    listTable('workout_sessions', profileId, '*, workout_exercises(*)'),
    listTable('body_measurements', profileId),
    listTable('progress_photos', profileId)
  ])
  return {
    workouts: workouts.map(normalizeWorkout),
    measurements: measurements.map(normalizeMeasurement),
    photos: photos.map(normalizePhoto)
  }
}

const allowedTables = new Set(['workout_sessions', 'body_measurements', 'progress_photos'])

export async function restoreArchivedItem(table, itemId) {
  if (!allowedTables.has(table)) throw new Error('Tipo de item invalido.')
  const payload = table === 'workout_sessions'
    ? { archived_at: null, updated_at: new Date().toISOString() }
    : { archived_at: null }
  const { error } = await supabase.from(table).update(payload).eq('id', itemId)
  if (error) throw error
}
