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

async function discardDraftAlreadyUsedBySession(record, profileId) {
  if (!record?.id) return record || null

  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('profile_id', profileId)
    .eq('client_operation_id', record.id)
    .limit(1)
    .maybeSingle()

  if (sessionError) throw sessionError
  if (!session) return record

  const { error: deleteError } = await supabase
    .from('workout_drafts')
    .delete()
    .eq('id', record.id)
    .eq('profile_id', profileId)
    .is('consumed_session_id', null)

  if (deleteError) throw deleteError

  logger.warn('workout_draft.stale_completed_operation_removed', {
    profileId,
    workoutType: record.workout_code,
    draftId: record.id,
    sessionId: session.id
  })
  return null
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
  return discardDraftAlreadyUsedBySession(data, profileId)
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
  return discardDraftAlreadyUsedBySession(data, profileId)
}

export async function upsertRemoteWorkoutDraft(draft) {
  const requestId = createRequestId()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const userId = authData.user?.id
  if (!userId) throw new Error('Faça login novamente para sincronizar o treino.')

  const { data, error } = await supabase.rpc('save_workout_draft_v2', {
    p_draft_id: draft.draftId,
    p_profile_id: draft.profileId,
    p_workout_code: draft.workoutType,
    p_program_enrollment_id: draft.programEnrollmentId || null,
    p_plan_fingerprint: draft.planFingerprint || null,
    p_payload: sanitizeDraftPayload(draft.payload)
  })

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
    version: data?.version
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
