import { logger } from '../lib/observability/logger'

const PREFIX = 'rhc_workout_draft_v1'
const MAX_DRAFT_BYTES = 256 * 1024
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const REMOTE_DEBOUNCE_MS = 1200
const remoteSyncTimers = new Map()

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
    updatedAt: input.updatedAt || new Date().toISOString()
  }
}

function scheduleRemoteDraftSync(record, key) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.onLine) return

  const existing = remoteSyncTimers.get(key)
  if (existing) window.clearTimeout(existing)

  const timer = window.setTimeout(async () => {
    remoteSyncTimers.delete(key)
    try {
      const latestRaw = localStorage.getItem(key)
      if (!latestRaw) return
      const latest = JSON.parse(latestRaw)
      if (!latest?.draftId || latest.draftId !== record.draftId) return

      const { upsertRemoteWorkoutDraft } = await import('./workoutDraftService')
      const remote = await upsertRemoteWorkoutDraft(latest)

      const currentRaw = localStorage.getItem(key)
      if (!currentRaw) return
      const current = JSON.parse(currentRaw)
      if (current?.draftId !== latest.draftId) return

      localStorage.setItem(key, JSON.stringify({
        ...current,
        remoteVersion: Number(remote.version || current.remoteVersion || 1),
        version: Math.max(Number(current.version || 1), Number(remote.version || 1)),
        updatedAt: remote.updated_at || current.updatedAt
      }))
    } catch (error) {
      logger.warn('workout_draft.remote_debounced_sync_failed', {
        profileId: record.profileId,
        workoutType: record.workoutType,
        error
      })
    }
  }, REMOTE_DEBOUNCE_MS)

  remoteSyncTimers.set(key, timer)
}

export function saveLocalWorkoutDraft(draft) {
  const identity = createWorkoutDraftIdentity(draft)
  const key = buildWorkoutDraftKey(identity)

  let existing = null
  try {
    const existingRaw = localStorage.getItem(key)
    if (existingRaw) existing = JSON.parse(existingRaw)
  } catch {
    existing = null
  }

  const sameDraft = existing?.draftId === identity.draftId
  const preservedRemoteVersion = draft.remoteVersion ?? (sameDraft ? existing?.remoteVersion : null) ?? null
  const preservedVersion = Math.max(
    Number(identity.version || 1),
    sameDraft ? Number(existing?.version || 1) : 1,
    preservedRemoteVersion != null ? Number(preservedRemoteVersion) : 1
  )

  const record = {
    ...draft,
    ...identity,
    version: preservedVersion,
    ...(preservedRemoteVersion != null ? { remoteVersion: Number(preservedRemoteVersion) } : {}),
    updatedAt: new Date().toISOString()
  }
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

  localStorage.setItem(key, serialized)
  scheduleRemoteDraftSync(record, key)
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
  const key = buildWorkoutDraftKey(identity)
  const timer = remoteSyncTimers.get(key)
  if (timer) {
    window.clearTimeout(timer)
    remoteSyncTimers.delete(key)
  }
  localStorage.removeItem(key)
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
        const timer = remoteSyncTimers.get(key)
        if (timer) {
          window.clearTimeout(timer)
          remoteSyncTimers.delete(key)
        }
        localStorage.removeItem(key)
        removed.push(key)
      }
    } catch {
      const timer = remoteSyncTimers.get(key)
      if (timer) {
        window.clearTimeout(timer)
        remoteSyncTimers.delete(key)
      }
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
