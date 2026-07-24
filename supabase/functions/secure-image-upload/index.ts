import { createClient } from 'npm:@supabase/supabase-js@2.95.0'
import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors'
import {
  inspectImage,
  MAX_AVATAR_BYTES,
  MAX_PROGRESS_BYTES
} from '../_shared/imageInspection.ts'
import { structuredLogger } from '../_shared/structuredLogger.ts'

const BUCKET = 'progress-photos'

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function operationError(stage: string, error: unknown, context: Record<string, unknown> = {}) {
  structuredLogger.error('secure_image_upload.operation_failed', {
    stage,
    error,
    ...context
  })
  return new Error(`${stage} failed`)
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID()

  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') {
    structuredLogger.warn('secure_image_upload.method_not_allowed', {
      requestId,
      method: request.method
    })
    return json({ error: 'method not allowed' }, 405)
  }

  let userId: string | undefined
  let profileId = ''
  let kind = ''

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authorization = request.headers.get('Authorization')
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      structuredLogger.warn('secure_image_upload.authentication_required', {
        requestId,
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(anonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasAuthorization: Boolean(authorization)
      })
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
    if (userError || !userData.user) {
      structuredLogger.warn('secure_image_upload.invalid_session', {
        requestId,
        error: userError
      })
      return json({ error: 'invalid session' }, 401)
    }
    userId = userData.user.id

    const form = await request.formData()
    kind = String(form.get('kind') || '')
    profileId = String(form.get('profileId') || '')
    const file = form.get('file')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) {
      structuredLogger.warn('secure_image_upload.invalid_profile', { requestId, userId })
      return json({ error: 'invalid profile' }, 400)
    }
    if (!(file instanceof File)) {
      structuredLogger.warn('secure_image_upload.image_required', { requestId, userId, profileId })
      return json({ error: 'image required' }, 400)
    }

    const isAvatar = kind === 'avatar'
    const isProgress = kind === 'progress'
    if (!isAvatar && !isProgress) {
      structuredLogger.warn('secure_image_upload.invalid_kind', { requestId, userId, profileId, kind })
      return json({ error: 'invalid upload kind' }, 400)
    }
    if (file.size <= 0 || file.size > (isAvatar ? MAX_AVATAR_BYTES : MAX_PROGRESS_BYTES)) {
      structuredLogger.warn('secure_image_upload.size_rejected', {
        requestId,
        userId,
        profileId,
        kind,
        sizeBytes: file.size
      })
      return json({ error: 'image size exceeds safe limit' }, 413)
    }

    const permissionFunction = isAvatar ? 'can_manage_profile' : 'can_edit_profile'
    const { data: allowed, error: permissionError } = await userClient.rpc(permissionFunction, {
      target_profile_id: profileId
    })
    if (permissionError || allowed !== true) {
      structuredLogger.warn('secure_image_upload.access_denied', {
        requestId,
        userId,
        profileId,
        kind,
        error: permissionError
      })
      return json({ error: 'access denied' }, 403)
    }

    const { error: rateError } = await userClient.rpc('enforce_security_rate_limit', {
      p_action: isAvatar ? 'avatar_upload' : 'progress_photo_upload'
    })
    if (rateError) {
      const limited = rateError.message?.includes('rate limit exceeded')
      structuredLogger.warn(limited ? 'secure_image_upload.rate_limited' : 'secure_image_upload.rate_limit_unavailable', {
        requestId,
        userId,
        profileId,
        kind,
        error: rateError
      })
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
      structuredLogger.error('secure_image_upload.profile_lookup_failed', {
        requestId,
        userId,
        profileId,
        kind,
        error: profileError || new Error('profile not found')
      })
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
        structuredLogger.warn('secure_image_upload.invalid_photo_metadata', {
          requestId,
          userId,
          profileId,
          kind,
          photoType
        })
        return json({ error: 'invalid photo metadata' }, 400)
      }
      path = `${profile.user_id}/${profileId}/${date}/${photoType}-${id}.${image.extension}`
    }

    const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(path, bytes, {
      contentType: image.contentType, cacheControl: '3600', upsert: false
    })
    if (uploadError) throw operationError('storage upload', uploadError, { requestId, userId, profileId, kind })

    if (isAvatar) {
      const { error: updateError } = await userClient.rpc('update_profile_avatar', {
        p_profile_id: profileId,
        p_avatar_path: path
      })
      if (updateError) {
        await adminClient.storage.from(BUCKET).remove([path])
        throw operationError('avatar update', updateError, { requestId, userId, profileId, kind })
      }
      const oldPath = profile.avatar_url
      if (oldPath?.startsWith(`${profile.user_id}/${profileId}/avatars/`)) {
        await adminClient.storage.from(BUCKET).remove([oldPath])
      }
      const { data: signed } = await adminClient.storage.from(BUCKET).createSignedUrl(path, 3600)
      structuredLogger.info('secure_image_upload.succeeded', {
        requestId,
        userId,
        profileId,
        kind,
        width: image.width,
        height: image.height
      })
      return json({ path, signedUrl: signed?.signedUrl || null, width: image.width, height: image.height })
    }

    const notes = String(form.get('notes') || '').slice(0, 500)
    const { data: photo, error: insertError } = await userClient.from('progress_photos').insert({
      user_id: profile.user_id, profile_id: profileId, date,
      photo_type: photoType, photo_url: path, notes: notes || null
    }).select('*').single()
    if (insertError) {
      await adminClient.storage.from(BUCKET).remove([path])
      throw operationError('photo insert', insertError, { requestId, userId, profileId, kind })
    }
    const { data: signed } = await adminClient.storage.from(BUCKET).createSignedUrl(path, 900)
    structuredLogger.info('secure_image_upload.succeeded', {
      requestId,
      userId,
      profileId,
      kind,
      photoType,
      width: image.width,
      height: image.height
    })
    return json({ photo: { ...photo, signedUrl: signed?.signedUrl || null }, width: image.width, height: image.height })
  } catch (error) {
    structuredLogger.error('secure_image_upload.failed', {
      requestId,
      userId,
      profileId: profileId || undefined,
      kind: kind || undefined,
      error
    })
    const message = error instanceof Error ? error.message : 'upload failed'
    const safeMessages = new Set(['unsupported or invalid image', 'image dimensions exceed safe limit'])
    return json({ error: safeMessages.has(message) ? message : 'upload failed' }, 400)
  }
})
