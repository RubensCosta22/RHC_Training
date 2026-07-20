import { supabase } from '../lib/supabaseClient'

const ERROR_MESSAGES = {
  'access denied': 'Você não tem permissão para alterar este perfil.',
  'rate limit exceeded': 'Muitas tentativas de envio. Aguarde um pouco e tente novamente.',
  'image size exceeds safe limit': 'A imagem excede o limite de tamanho permitido.',
  'unsupported or invalid image': 'O arquivo não é uma imagem válida ou suportada.',
  'image dimensions exceed safe limit': 'As dimensões da imagem excedem o limite permitido.',
  'profile not found': 'Perfil não encontrado ou indisponível para esta conta.'
}

export function friendlyUploadError(message) {
  return ERROR_MESSAGES[message] || 'Falha no envio seguro da imagem.'
}

export async function invokeSecureImageUpload(body) {
  const { data, error } = await supabase.functions.invoke('secure-image-upload', { body })
  if (!error) return data

  let serverMessage = ''
  try {
    serverMessage = (await error.context?.json())?.error || ''
  } catch {
    // Keep the client response generic when the function does not return JSON.
  }
  throw new Error(friendlyUploadError(serverMessage))
}
