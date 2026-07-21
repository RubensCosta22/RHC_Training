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
    .from('profile_program_enrollments')
    .select('id,status,start_date,current_week,program_id,training_programs(id,slug,name,duration_weeks)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function applyProgramToProfile(profileId, programSlug, startDate = null) {
  if (programSlug !== 'rhc-strength-12w') {
    throw new Error('Programa ainda não disponível para publicação administrativa.')
  }

  const { data, error } = await supabase.rpc('activate_rhc_strength_12w', {
    p_profile_id: profileId,
    p_start_date: startDate || new Date().toISOString().slice(0, 10)
  })

  if (error) throw error
  return data
}
