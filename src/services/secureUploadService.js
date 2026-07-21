import { supabase } from '../lib/supabaseClient'
import { friendlyUploadError } from './uploadErrors'

export { friendlyUploadError } from './uploadErrors'

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
