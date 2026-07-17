import { supabase } from '../lib/supabaseClient'

async function listTable(table, profileId, select = '*') {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('profile_id', profileId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function listArchivedItems(profileId) {
  const [workouts, measurements, photos] = await Promise.all([
    listTable('workout_sessions', profileId, '*, workout_exercises(*)'),
    listTable('body_measurements', profileId),
    listTable('progress_photos', profileId)
  ])

  return { workouts, measurements, photos }
}

const allowedTables = new Set([
  'workout_sessions',
  'body_measurements',
  'progress_photos'
])

export async function restoreArchivedItem(table, itemId) {
  if (!allowedTables.has(table)) throw new Error('Tipo de item invalido.')

  const { error } = await supabase
    .from(table)
    .update({ archived_at: null })
    .eq('id', itemId)

  if (error) throw error
}
