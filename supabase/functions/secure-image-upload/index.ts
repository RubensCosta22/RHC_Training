import { createClient } from 'npm:@supabase/supabase-js@2.95.0'
import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors'
import {
  inspectImage,
  MAX_AVATAR_BYTES,
  MAX_PROGRESS_BYTES
} from '../_shared/imageInspection.ts'

const BUCKET = 'progress-photos'

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function operationError(stage: string, error: unknown) {
  const detail = error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : String(error)
  console.error(`secure-image-upload ${stage} failed`, detail)
  return new Error(`${stage} failed`)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authorization = request.headers.get('Authorization')
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      return json({ error: 'authentication required' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'invalid session' }, 401)

    const form = await request.formData()
    const kind = String(form.get('kind') || '')
    const profileId = String(form.get('profileId') || '')
    const file = form.get('file')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) {
      return json({ error: 'invalid profile' }, 400)
    }
    if (!(file instanceof File)) return json({ error: 'image required' }, 400)

    const isAvatar = kind === 'avatar'
    const isProgress = kind === 'progress'
    if (!isAvatar && !isProgress) return json({ error: 'invalid upload kind' }, 400)
    if (file.size <= 0 || file.size > (isAvatar ? MAX_AVATAR_BYTES : MAX_PROGRESS_BYTES)) {
      return json({ error: 'image size exceeds safe limit' }, 413)
    }

    const permissionFunction = isAvatar ? 'can_manage_profile' : 'can_edit_profile'
    const { data: allowed, error: permissionError } = await userClient.rpc(permissionFunction, {
      target_profile_id: profileId
    })
    if (permissionError || allowed !== true) return json({ error: 'access denied' }, 403)

    const { error: rateError } = await userClient.rpc('enforce_security_rate_limit', {
      p_action: isAvatar ? 'avatar_upload' : 'progress_photo_upload'
    })
    if (rateError) {
      const limited = rateError.message?.includes('rate limit exceeded')
      return json({ error: limited ? 'rate limit exceeded' : 'rate limit unavailable' }, limited ? 429 : 503)
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const image = inspectImage(bytes)
    // The permission RPC above already authorizes this profile for the current
    // session. Read it through the same RLS-scoped client so authorization and
    // row visibility cannot diverge from the service-role lookup.
    const { data: profile, error: profileError } = await userClient
      .from('profiles').select('user_id,avatar_url').eq('id', profileId).single()
    if (profileError || !profile) {
      console.error('secure-image-upload profile lookup failed', profileError?.message || 'profile not found')
      return json({ error: 'profile not found' }, 404)
    }

    const id = crypto.randomUUID()
    let path: string
    let date = ''
    let photoType = ''
    if (isAvatar) {
      path = `${profile.user_id}/${profileId}/avatars/avatar-${id}.${image.extension}`
    } else {
      date = String(form.get('date') || '')
      photoType = String(form.get('photoType') || '')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['frente', 'lado', 'costas'].includes(photoType)) {
        return json({ error: 'invalid photo metadata' }, 400)
      }
      path = `${profile.user_id}/${profileId}/${date}/${photoType}-${id}.${image.extension}`
    }

    const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(path, bytes, {
      contentType: image.contentType, cacheControl: '3600', upsert: false
    })
    if (uploadError) throw operationError('storage upload', uploadError)

    if (isAvatar) {
      const { error: updateError } = await adminClient.from('profiles')
        .update({ avatar_url: path }).eq('id', profileId)
      if (updateError) {
        await adminClient.storage.from(BUCKET).remove([path])
        throw operationError('avatar update', updateError)
      }
      const oldPath = profile.avatar_url
      if (oldPath?.startsWith(`${profile.user_id}/${profileId}/avatars/`)) {
        await adminClient.storage.from(BUCKET).remove([oldPath])
      }
      const { data: signed } = await adminClient.storage.from(BUCKET).createSignedUrl(path, 3600)
      return json({ path, signedUrl: signed?.signedUrl || null, width: image.width, height: image.height })
    }

    const notes = String(form.get('notes') || '').slice(0, 500)
    const { data: photo, error: insertError } = await adminClient.from('progress_photos').insert({
      user_id: profile.user_id, profile_id: profileId, date,
      photo_type: photoType, photo_url: path, notes: notes || null
    }).select('*').single()
    if (insertError) {
      await adminClient.storage.from(BUCKET).remove([path])
      throw operationError('photo insert', insertError)
    }
    const { data: signed } = await adminClient.storage.from(BUCKET).createSignedUrl(path, 900)
    return json({ photo: { ...photo, signedUrl: signed?.signedUrl || null }, width: image.width, height: image.height })
  } catch (error) {
    console.error('secure-image-upload failed', error instanceof Error ? error.message : 'unknown error')
    const message = error instanceof Error ? error.message : 'upload failed'
    const safeMessages = new Set(['unsupported or invalid image', 'image dimensions exceed safe limit'])
    return json({ error: safeMessages.has(message) ? message : 'upload failed' }, 400)
  }
})
