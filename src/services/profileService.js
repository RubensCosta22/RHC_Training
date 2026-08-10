import { supabase } from '../lib/supabaseClient'
import { validateUuid } from '../utils/validation'
import { invokeSecureImageUpload } from './secureUploadService'

const AVATAR_BUCKET = 'progress-photos'
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function normalizeProfile(profile) {
  if (!profile) return profile
  return {
    ...profile,
    avatar_url: profile.avatar_path || null,
    family_group_id: null,
    user_id: null,
    age: profile.age ?? null
  }
}

async function attachAvatar(profile) {
  const normalized = normalizeProfile(profile)
  if (!normalized?.avatar_path?.includes('/')) return { ...normalized, avatarSignedUrl: null }
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(normalized.avatar_path, 60 * 60)
  return { ...normalized, avatarSignedUrl: data?.signedUrl || null }
}

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

// V2 profiles are provisioned explicitly by administrators/migration.
// Never seed or auto-create profiles from the browser.
export async function ensureDefaultProfiles() {
  const user = await getSessionUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name')

  if (error) throw error
  return Promise.all((data || []).map(attachAvatar))
}

export async function getProfilesWithLastWorkout() {
  const profiles = await ensureDefaultProfiles()

  return Promise.all(
    profiles.map(async (profile) => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('workout_code,workout_date,gym_name,created_at')
        .eq('profile_id', profile.id)
        .is('archived_at', null)
        .order('workout_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastWorkout = data ? {
        ...data,
        workout_type: data.workout_code,
        date: data.workout_date
      } : null

      return { ...profile, lastWorkout }
    })
  )
}

export async function getProfile(profileId) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', cleanProfileId)
    .maybeSingle()

  if (error) throw error
  return data ? attachAvatar(data) : null
}

export async function uploadProfileAvatar(profileId, file) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  if (!file) throw new Error('Selecione uma foto.')
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.')
  if (file.size > 3 * 1024 * 1024) throw new Error('Use uma imagem de ate 3 MB.')

  const body = new FormData()
  body.append('kind', 'avatar')
  body.append('profileId', cleanProfileId)
  body.append('file', file)

  const data = await invokeSecureImageUpload(body)
  if (!data?.path) throw new Error(data?.error || 'Falha no envio seguro da imagem.')
  return { path: data.path, signedUrl: data.signedUrl || null }
}
