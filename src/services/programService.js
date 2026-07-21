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
    .from('profile_program_enrollments')
    .select('*, training_programs(*)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data || null
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
    .from('profile_program_exercise_baselines')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('established_at')

  if (error) throw error
  return data || []
}
