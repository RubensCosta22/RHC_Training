import { supabase } from '../lib/supabaseClient'
import { getProgramWorkoutProgress } from '../utils/workoutRotation'

export async function getPublishedPrograms() {
  const { data, error } = await supabase
    .from('training_programs')
    .select(`
      *,
      program_phases(*),
      program_sessions(
        *,
        program_exercises(
          *,
          program_exercise_substitutions(*)
        )
      )
    `)
    .eq('status', 'published')
    .order('name')

  if (error) throw error
  return data || []
}

export async function getProfileProgramEnrollment(profileId) {
  const { data, error } = await supabase
    .from('program_enrollments')
    .select('*, training_programs(*)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function getProgramStartState(profileId) {
  const enrollment = await getProfileProgramEnrollment(profileId)
  if (!enrollment) return null

  const [sessions, workouts] = await Promise.all([
    supabase.from('program_sessions').select('code,session_type')
      .eq('program_id', enrollment.program_id).order('day_order'),
    supabase.from('workout_sessions')
      .select('workout_code,workout_date,created_at,program_exercise_exposures!program_exercise_exposures_workout_session_id_fkey(enrollment_id,completed_sets)')
      .eq('profile_id', profileId).gte('created_at', enrollment.created_at)
      .is('archived_at', null)
      .order('workout_date', { ascending: false }).order('created_at', { ascending: false })
  ])
  if (sessions.error) throw sessions.error
  if (workouts.error) throw workouts.error
  return getProgramWorkoutProgress(sessions.data || [], workouts.data || [], enrollment.id)
}

export async function getProfileTrainingArchives(profileId) {
  const { data, error } = await supabase
    .from('profile_training_archives')
    .select('*')
    .eq('profile_id', profileId)
    .order('archived_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function archiveCurrentTrainingHistory({ profileId, label, historyThrough, metadata = {} }) {
  const { data, error } = await supabase.rpc('archive_profile_training_history', {
    p_profile_id: profileId,
    p_label: label,
    p_history_through: historyThrough,
    p_metadata: metadata
  })

  if (error) throw error
  return data
}

export async function getExerciseBaselines(enrollmentId) {
  const { data, error } = await supabase
    .from('program_exercise_baselines')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('established_at')

  if (error) throw error
  return data || []
}
