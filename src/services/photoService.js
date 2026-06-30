import { supabase } from '../lib/supabaseClient'
import { sanitizeText } from '../utils/validation'

const BUCKET = 'progress-photos'
const PHOTO_TYPES = ['frente', 'lado', 'costas']

export async function listPhotos(profileId) {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('profile_id', profileId)
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

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Faça login novamente para enviar foto.')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeDate = date || new Date().toISOString().slice(0, 10)
  const path = `${userId}/${profileId}/${safeDate}/${photoType}-${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      user_id: userId,
      profile_id: profileId,
      date: safeDate,
      photo_type: photoType,
      photo_url: path,
      notes: sanitizeText(notes, 500)
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}
