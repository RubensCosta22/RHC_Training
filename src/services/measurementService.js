import { supabase } from '../lib/supabaseClient'
import { validateMeasurementInput, validateUuid } from '../utils/validation'

export async function listMeasurements(profileId) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', cleanProfileId)
    .is('archived_at', null)
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveMeasurement(profileId, values) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user?.id) throw new Error('Faça login novamente para salvar medidas.')
  const { data: profile, error: profileError } = await supabase.from('profiles').select('user_id').eq('id', cleanProfileId).single()
  if (profileError) throw profileError
  const clean = validateMeasurementInput(values)

  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: profile.user_id,
      profile_id: cleanProfileId,
      date: clean.date,
      weight: clean.weight,
      waist: clean.waist,
      chest: clean.chest,
      arm: clean.arm,
      thigh: clean.thigh,
      hip: clean.hip,
      notes: clean.notes
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function archiveMeasurement(measurementId) {
  const cleanMeasurementId = validateUuid(measurementId, 'Medida')
  const { error } = await supabase
    .from('body_measurements')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', cleanMeasurementId)

  if (error) throw error
}
