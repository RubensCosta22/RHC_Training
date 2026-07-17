import { supabase } from '../lib/supabaseClient'
import { profilesSeed } from '../data/workouts'

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export async function ensureDefaultProfiles() {
  const user = await getSessionUser()
  if (!user) return []

  const { data: existing, error: listError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (listError) throw listError

  const existingNames = new Set((existing || []).map((profile) => profile.name))

  const missing = profilesSeed.filter((profile) => !existingNames.has(profile.name))

  if (missing.length) {
    const payload = missing.map((profile) => ({
      ...profile,
      user_id: user.id
    }))

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(payload, {
        onConflict: 'user_id,name',
        ignoreDuplicates: true
      })

    if (upsertError) throw upsertError
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (error) throw error
  return data || []
}

export async function getProfilesWithLastWorkout() {
  const profiles = await ensureDefaultProfiles()

  const withLast = await Promise.all(
    profiles.map(async (profile) => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('workout_type,date,gym_name,created_at')
        .eq('profile_id', profile.id)
        .is('archived_at', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return { ...profile, lastWorkout: data }
    })
  )

  return withLast
}

export async function getProfile(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle()

  if (error) throw error
  return data
}
