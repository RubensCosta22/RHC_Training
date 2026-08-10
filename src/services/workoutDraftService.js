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

function createConflictError() {
  const conflict = new Error('O treino foi atualizado em outro dispositivo.')
  conflict.code = 'DRAFT_CONFLICT'
  return conflict
}

export function remoteRecordToWorkoutDraft(record) {
  if (!record) return null
  return {
    draftId: record.id,
    userId: null,
    profileId: record.profile_id,
    workoutType: record.workout_code,
    programEnrollmentId: record.program_enrollment_id || null,
    planFingerprint: record.plan_fingerprint || null,
    payload: record.payload || {},
    version: Number(record.version || 1),
    remoteVersion: Number(record.version || 1),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  }
}

export async function getRemoteWorkoutDraft({ draftId, profileId }) {
  const { data, error } = await supabase
    .from('workout_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('profile_id', profileId)
    .is('consumed_session_id', null)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function getLatestRemoteWorkoutDraft({ profileId, workoutType, programEnrollmentId = null }) {
  let query = supabase
    .from('workout_drafts')
    .select('*')
    .eq('profile_id', profileId)
    .eq('workout_code', workoutType)
    .is('consumed_session_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)

  query = programEnrollmentId
    ? query.eq('program_enrollment_id', programEnrollmentId)
    : query.is('program_enrollment_id', null)

  const { data, error } = await query.maybeSingle()
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
    id: draft.draftId,
    profile_id: draft.profileId,
    workout_code: draft.workoutType,
    program_enrollment_id: draft.programEnrollmentId || null,
    plan_fingerprint: draft.planFingerprint || null,
    payload: sanitizeDraftPayload(draft.payload),
    version: Math.max(1, Number(draft.version || 1)),
    client_operation_id: draft.draftId,
    updated_at: new Date().toISOString()
  }

  if (expectedVersion != null) {
    const nextVersion = Number(expectedVersion) + 1
    const { data, error } = await supabase
      .from('workout_drafts')
      .update({
        profile_id: record.profile_id,
        workout_code: record.workout_code,
        program_enrollment_id: record.program_enrollment_id,
        plan_fingerprint: record.plan_fingerprint,
        payload: record.payload,
        version: nextVersion,
        updated_at: record.updated_at
      })
      .eq('id', draft.draftId)
      .eq('profile_id', draft.profileId)
      .eq('version', expectedVersion)
      .is('consumed_session_id', null)
      .select('*')
      .maybeSingle()

    if (error) throw error
    if (!data) throw createConflictError()
    return data
  }

  const { data, error } = await supabase
    .from('workout_drafts')
    .insert(record)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') throw createConflictError()
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
    .eq('id', draftId)
    .eq('profile_id', profileId)

  if (error) throw error
}
