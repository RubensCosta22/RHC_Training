import { supabase } from '../lib/supabaseClient'

export async function getExerciseRecords(profileId, exerciseNames = []) {
  let catalogQuery = supabase
    .from('exercise_catalog')
    .select('id,name')
    .eq('is_active', true)

  if (exerciseNames.length) {
    const normalized = [...new Set(exerciseNames.map((name) => String(name || '').trim()).filter(Boolean))]
    if (!normalized.length) return {}
    catalogQuery = catalogQuery.in('name', normalized)
  }

  const { data: catalog, error: catalogError } = await catalogQuery
  if (catalogError) throw catalogError
  if (!catalog?.length) return {}

  const nameById = new Map(catalog.map((item) => [item.id, item.name]))
  const { data: records, error: recordsError } = await supabase
    .from('exercise_records')
    .select('*')
    .eq('profile_id', profileId)
    .in('exercise_id', [...nameById.keys()])

  if (recordsError) throw recordsError

  return (records || []).reduce((acc, record) => {
    const exerciseName = nameById.get(record.exercise_id)
    if (!exerciseName) return acc
    acc[exerciseName] = { ...record, exercise_name: exerciseName }
    return acc
  }, {})
}
