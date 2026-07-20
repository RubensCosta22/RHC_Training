import { supabase } from '../lib/supabaseClient'
import { profilesSeed } from '../data/workouts'
import { claimFamilyProfile, getFamilyContext } from './familyService'

const AVATAR_BUCKET = 'progress-photos'

async function attachAvatar(profile) {
  if (!profile?.avatar_url?.includes('/')) return { ...profile, avatarSignedUrl: null }
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(profile.avatar_url, 60 * 60)
  return { ...profile, avatarSignedUrl: data?.signedUrl || null }
}

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export async function ensureDefaultProfiles() {
  const user = await getSessionUser()
  if (!user) return []

  await claimFamilyProfile()
  const family = await getFamilyContext()

  let existingQuery = supabase
    .from('profiles')
    .select('*')
    .order('name')
  if (family) existingQuery = existingQuery.eq('family_group_id', family.group_id)
  const { data: existing, error: listError } = await existingQuery

  if (listError) throw listError

  const existingNames = new Set((existing || []).map((profile) => profile.name))

  const missing = family ? [] : profilesSeed.filter((profile) => !existingNames.has(profile.name))

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

  let finalQuery = supabase
    .from('profiles')
    .select('*')
    .order('name')
  if (family) finalQuery = finalQuery.eq('family_group_id', family.group_id)
  const { data, error } = await finalQuery

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

      return attachAvatar({ ...profile, lastWorkout: data })
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
  return data ? attachAvatar(data) : null
}

export async function uploadProfileAvatar(profileId, file) {
  if (!file) throw new Error('Selecione uma foto.')
  if (!file.type.startsWith('image/')) throw new Error('O arquivo precisa ser uma imagem.')
  if (file.size > 3 * 1024 * 1024) throw new Error('Use uma imagem de ate 3 MB.')

  const { data: profile, error: profileError } = await supabase.from('profiles').select('user_id,avatar_url').eq('id', profileId).single()
  if (profileError) throw profileError
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${profile.user_id}/${profileId}/avatars/avatar-${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type })
  if (uploadError) throw uploadError

  const { error: updateError } = await supabase.rpc('update_profile_avatar', { p_profile_id:profileId, p_avatar_path:path })
  if (updateError) { await supabase.storage.from(AVATAR_BUCKET).remove([path]); throw updateError }

  const oldPath = profile.avatar_url
  if (oldPath?.includes(`/${profileId}/avatars/`)) await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
  const { data: signed } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60)
  return { path, signedUrl:signed?.signedUrl || null }
}
