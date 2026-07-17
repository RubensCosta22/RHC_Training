import { supabase } from '../lib/supabaseClient'
import { validateMeasurementInput } from '../utils/validation'

export async function listMeasurements(profileId) {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveMeasurement(profileId, values) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Faça login novamente para salvar medidas.')
  const clean = validateMeasurementInput(values)

  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: userId,
      profile_id: profileId,
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
  const { error } = await supabase
    .from('body_measurements')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', measurementId)

  if (error) throw error
}
