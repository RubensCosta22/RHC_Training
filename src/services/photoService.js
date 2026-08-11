import { supabase } from '../lib/supabaseClient'
import { toLocalDateKey } from '../utils/date'
import { sanitizeText, validateUuid } from '../utils/validation'

const BUCKET = 'progress-photos'
const PHOTO_TYPES = ['frente', 'lado', 'costas']
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function normalizePhoto(photo) {
  return photo ? { ...photo, date: photo.photo_date, photo_url: photo.object_path } : photo
}

async function sha256File(file) {
  const bytes = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

function extensionFor(file) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export async function listPhotos(profileId) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('profile_id', cleanProfileId)
    .is('archived_at', null)
    .order('photo_date', { ascending: false })
  if (error) throw error

  return Promise.all((data || []).map(async (raw) => {
    const photo = normalizePhoto(raw)
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(photo.object_path, 60 * 15)
    return { ...photo, signedUrl: signed?.signedUrl || null }
  }))
}

export async function uploadProgressPhoto({ profileId, date, photoType, file, notes }) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  if (!PHOTO_TYPES.includes(photoType)) throw new Error('Tipo de foto inválido.')
  if (!file) throw new Error('Selecione uma foto.')
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.')
  if (file.size > 6 * 1024 * 1024) throw new Error('Imagem muito grande. Use até 6 MB.')

  const safeDate = date || toLocalDateKey()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) throw new Error('Data da foto inválida.')

  const objectPath = `profiles/${cleanProfileId}/${safeDate}/${photoType}-${crypto.randomUUID()}.${extensionFor(file)}`
  const sha256 = await sha256File(file)
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false
  })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      profile_id: cleanProfileId,
      photo_date: safeDate,
      photo_type: photoType,
      object_path: objectPath,
      byte_size: file.size,
      sha256,
      notes: sanitizeText(notes || '', 500) || null
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([objectPath]).catch(() => undefined)
    throw error
  }

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 60 * 15)
  return { ...normalizePhoto(data), signedUrl: signed?.signedUrl || null }
}

export async function archivePhoto(photoId) {
  const cleanPhotoId = validateUuid(photoId, 'Foto')
  const { error } = await supabase
    .from('progress_photos')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', cleanPhotoId)
  if (error) throw error
}
