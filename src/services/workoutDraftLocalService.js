import { logger } from '../lib/observability/logger'

const PREFIX = 'rhc_workout_draft_v1'
const MAX_DRAFT_BYTES = 256 * 1024
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000

function requirePart(value, label) {
  const text = String(value || '').trim()
  if (!text) throw new Error(`${label} ausente para identificar o rascunho.`)
  return text
}

export function buildWorkoutDraftKey({ userId, profileId, workoutType, programEnrollmentId = 'none' }) {
  return [
    PREFIX,
    requirePart(userId, 'Usuario'),
    requirePart(profileId, 'Perfil'),
    requirePart(workoutType, 'Treino'),
    String(programEnrollmentId || 'none')
  ].join(':')
}

export function createWorkoutDraftIdentity(input) {
  return {
    draftId: input.draftId || crypto.randomUUID(),
    userId: requirePart(input.userId, 'Usuario'),
    profileId: requirePart(input.profileId, 'Perfil'),
    workoutType: requirePart(input.workoutType, 'Treino'),
    programEnrollmentId: input.programEnrollmentId || null,
    planFingerprint: input.planFingerprint || null,
    version: Number(input.version || 1),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export function saveLocalWorkoutDraft(draft) {
  const identity = createWorkoutDraftIdentity(draft)
  const record = { ...draft, ...identity, updatedAt: new Date().toISOString() }
  const serialized = JSON.stringify(record)

  if (serialized.length > MAX_DRAFT_BYTES) {
    logger.warn('workout_draft.local_size_exceeded', {
      userId: identity.userId,
      profileId: identity.profileId,
      workoutType: identity.workoutType,
      maxBytes: MAX_DRAFT_BYTES
    })
    throw new Error('O rascunho do treino excedeu o limite seguro deste dispositivo.')
  }

  const key = buildWorkoutDraftKey(identity)
  localStorage.setItem(key, serialized)
  return record
}

export function loadLocalWorkoutDraft(identity) {
  const key = buildWorkoutDraftKey(identity)
  const raw = localStorage.getItem(key)
  if (!raw) return null

  try {
    const draft = JSON.parse(raw)
    if (draft.userId !== String(identity.userId) || draft.profileId !== String(identity.profileId)) {
      logger.warn('workout_draft.local_owner_mismatch', {
        profileId: identity.profileId,
        workoutType: identity.workoutType
      })
      return null
    }
    return draft
  } catch (error) {
    logger.warn('workout_draft.local_parse_failed', {
      profileId: identity.profileId,
      workoutType: identity.workoutType,
      error
    })
    return null
  }
}

export function removeLocalWorkoutDraft(identity) {
  localStorage.removeItem(buildWorkoutDraftKey(identity))
}

export function isWorkoutDraftExpired(draft, now = Date.now()) {
  const updatedAt = Date.parse(draft?.updatedAt || '')
  return !Number.isFinite(updatedAt) || now - updatedAt > RETENTION_MS
}

export function purgeExpiredWorkoutDrafts({ userId, now = Date.now() }) {
  const userPrefix = `${PREFIX}:${String(userId)}:`
  const removed = []

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith(userPrefix)) continue
    try {
      const draft = JSON.parse(localStorage.getItem(key) || 'null')
      if (isWorkoutDraftExpired(draft, now)) {
        localStorage.removeItem(key)
        removed.push(key)
      }
    } catch {
      localStorage.removeItem(key)
      removed.push(key)
    }
  }

  return removed.length
}

export function clearLoadedWorkoutDraftState() {
  // Local drafts remain namespaced for recovery. Components must clear in-memory state on logout.
  return true
}
