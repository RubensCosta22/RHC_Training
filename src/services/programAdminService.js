import { toLocalDateKey } from '../utils/date'
import { supabase } from '../lib/supabaseClient'

export async function listPublishedPrograms() {
  const { data, error } = await supabase
    .from('training_programs')
    .select('id,slug,name,objective,duration_weeks,description,status')
    .eq('status', 'published')
    .order('name')

  if (error) throw error
  return data || []
}

export async function getProfileProgramState(profileId) {
  const { data, error } = await supabase
    .from('program_enrollments')
    .select('id,status,start_date,current_week,program_id,training_programs(id,slug,name,duration_weeks)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function applyProgramToProfile(profileId, programSlug, startDate = null) {
  const { data, error } = await supabase.rpc('activate_training_program_v2', {
    p_profile_id: profileId, p_program_slug: programSlug,
    p_start_date: startDate || toLocalDateKey(),
    p_baseline_before: null
  })

  if (error) throw error
  return data
}
