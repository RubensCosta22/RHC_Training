import { supabase } from '../lib/supabaseClient'
import { validateMeasurementInput, validateUuid } from '../utils/validation'

function normalizeMeasurement(row) {
  return row ? { ...row, date: row.measured_on } : row
}

export async function listMeasurements(profileId) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', cleanProfileId)
    .is('archived_at', null)
    .order('measured_on', { ascending: false })
  if (error) throw error
  return (data || []).map(normalizeMeasurement)
}

export async function saveMeasurement(profileId, values) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  const clean = validateMeasurementInput(values)
  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      profile_id: cleanProfileId,
      measured_on: clean.date,
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
  return normalizeMeasurement(data)
}

export async function archiveMeasurement(measurementId) {
  const cleanMeasurementId = validateUuid(measurementId, 'Medida')
  const { error } = await supabase
    .from('body_measurements')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', cleanMeasurementId)
  if (error) throw error
}
