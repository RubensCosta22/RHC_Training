import { supabase } from '../lib/supabaseClient'

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

  const [sessions, exposures] = await Promise.all([
    supabase.from('program_sessions').select('code')
      .eq('program_id', enrollment.program_id).order('day_order').limit(1),
    supabase.from('program_exercise_exposures')
      .select('id, workout_sessions!program_exercise_exposures_workout_session_id_fkey!inner(archived_at)')
      .eq('enrollment_id', enrollment.id).gt('completed_sets', 0)
      .is('workout_sessions.archived_at', null).limit(1)
  ])
  if (sessions.error) throw sessions.error
  if (exposures.error) throw exposures.error
  return {
    firstWorkoutType: sessions.data?.[0]?.code || null,
    hasStarted: Boolean(exposures.data?.length)
  }
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
