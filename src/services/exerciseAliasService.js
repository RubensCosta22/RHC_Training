import { supabase } from '../lib/supabaseClient'

export async function getExerciseAliases() {
  const { data, error } = await supabase.from('exercise_aliases').select('alias_exercise_id,canonical_exercise_id')
  if (error) throw error
  return data || []
}

export function canonicalExerciseId(id, aliases = []) {
  return aliases.find(item => item.alias_exercise_id === id)?.canonical_exercise_id || id
}

export function equivalentExerciseIds(id, aliases = []) {
  const canonical = canonicalExerciseId(id, aliases)
  return [canonical, ...aliases.filter(item => item.canonical_exercise_id === canonical).map(item => item.alias_exercise_id)]
}
