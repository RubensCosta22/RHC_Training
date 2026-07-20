import { supabase } from '../lib/supabaseClient'
import { toLocalDateKey } from '../utils/date'
import { invokeSecureImageUpload } from './secureUploadService'

const BUCKET = 'progress-photos'
const PHOTO_TYPES = ['frente', 'lado', 'costas']

export async function listPhotos(profileId) {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('profile_id', profileId)
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
  if (!PHOTO_TYPES.includes(photoType)) throw new Error('Tipo de foto inválido.')
  if (!file) throw new Error('Selecione uma foto.')
  if (!file.type.startsWith('image/')) throw new Error('Arquivo precisa ser uma imagem.')
  if (file.size > 6 * 1024 * 1024) throw new Error('Imagem muito grande. Use até 6 MB.')

  const safeDate = date || toLocalDateKey()
  const body = new FormData()
  body.append('kind', 'progress')
  body.append('profileId', profileId)
  body.append('date', safeDate)
  body.append('photoType', photoType)
  body.append('notes', String(notes || ''))
  body.append('file', file)

  const data = await invokeSecureImageUpload(body)
  if (!data?.photo) throw new Error(data?.error || 'Falha no envio seguro da imagem.')
  return data.photo
}

export async function archivePhoto(photoId) {
  const { error } = await supabase
    .from('progress_photos')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', photoId)

  if (error) throw error
}
