import { supabase } from '../lib/supabaseClient'
import { toLocalDateKey } from '../utils/date'
import { sanitizeText, validateUuid } from '../utils/validation'
import { invokeSecureImageUpload } from './secureUploadService'

const BUCKET = 'progress-photos'
const PHOTO_TYPES = ['frente', 'lado', 'costas']
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function listPhotos(profileId) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('profile_id', cleanProfileId)
    .is('archived_at', null)
    .order('date', { ascending: false })
  if (error) throw error

  const withSignedUrls = await Promise.all((data || []).map(async (photo) => {
    const path = photo.photo_url
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 15)
    return { ...photo, signedUrl: signed?.signedUrl }
  }))

  return withSignedUrls
}

export async function uploadProgressPhoto({ profileId, date, photoType, file, notes }) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  if (!PHOTO_TYPES.includes(photoType)) throw new Error('Tipo de foto inválido.')
  if (!file) throw new Error('Selecione uma foto.')
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.')
  if (file.size > 6 * 1024 * 1024) throw new Error('Imagem muito grande. Use até 6 MB.')

  const safeDate = date || toLocalDateKey()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) throw new Error('Data da foto inválida.')

  const body = new FormData()
  body.append('kind', 'progress')
  body.append('profileId', cleanProfileId)
  body.append('date', safeDate)
  body.append('photoType', photoType)
  body.append('notes', sanitizeText(notes || '', 500))
  body.append('file', file)

  const data = await invokeSecureImageUpload(body)
  if (!data?.photo) throw new Error(data?.error || 'Falha no envio seguro da imagem.')
  return data.photo
}

export async function archivePhoto(photoId) {
  const cleanPhotoId = validateUuid(photoId, 'Foto')
  const { error } = await supabase
    .from('progress_photos')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', cleanPhotoId)

  if (error) throw error
}
