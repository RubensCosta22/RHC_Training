import { supabase } from '../lib/supabaseClient'
import { logger, createRequestId } from '../lib/observability/logger'

function sanitizeDraftPayload(payload) {
  const safe = structuredClone(payload || {})
  if (safe.running) {
    delete safe.running.gpsPoints
    delete safe.running.latitude
    delete safe.running.longitude
  }
  return safe
}

export async function getRemoteWorkoutDraft({ draftId, profileId }) {
  const { data, error } = await supabase
    .from('workout_drafts')
    .select('*')
    .eq('draft_id', draftId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function upsertRemoteWorkoutDraft(draft, expectedVersion = null) {
  const requestId = createRequestId()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const userId = authData.user?.id
  if (!userId) throw new Error('Faça login novamente para sincronizar o treino.')

  const record = {
    draft_id: draft.draftId,
    user_id: userId,
    profile_id: draft.profileId,
    workout_type: draft.workoutType,
    program_enrollment_id: draft.programEnrollmentId || null,
    plan_fingerprint: draft.planFingerprint || null,
    payload: sanitizeDraftPayload(draft.payload),
    version: Math.max(1, Number(draft.version || 1)),
    updated_at: new Date().toISOString()
  }

  if (expectedVersion != null) {
    const nextVersion = Number(expectedVersion) + 1
    const { data, error } = await supabase
      .from('workout_drafts')
      .update({ ...record, version: nextVersion })
      .eq('draft_id', draft.draftId)
      .eq('user_id', userId)
      .eq('version', expectedVersion)
      .select('*')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      const conflict = new Error('O treino foi atualizado em outro dispositivo.')
      conflict.code = 'DRAFT_CONFLICT'
      throw conflict
    }
    return data
  }

  const { data, error } = await supabase
    .from('workout_drafts')
    .upsert(record, { onConflict: 'draft_id' })
    .select('*')
    .single()

  if (error) {
    logger.warn('workout_draft.remote_save_failed', {
      requestId,
      userId,
      profileId: draft.profileId,
      workoutType: draft.workoutType,
      error
    })
    throw error
  }

  logger.info('workout_draft.remote_saved', {
    requestId,
    userId,
    profileId: draft.profileId,
    workoutType: draft.workoutType,
    version: data.version
  })
  return data
}

export async function removeRemoteWorkoutDraft({ draftId, profileId }) {
  const { error } = await supabase
    .from('workout_drafts')
    .delete()
    .eq('draft_id', draftId)
    .eq('profile_id', profileId)

  if (error) throw error
}
