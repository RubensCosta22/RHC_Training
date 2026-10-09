import { logger } from '../lib/observability/logger'

const PENDING_KEY = 'mtp_pending_workouts'
const SELECTED_PROFILE_KEY = 'mtp_selected_profile_id'
const MAX_PENDING_WORKOUTS = 20
const MAX_PENDING_BYTES = 256 * 1024

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export function saveSelectedProfile(profileId) {
  localStorage.setItem(SELECTED_PROFILE_KEY, profileId)
}

export function getSelectedProfile() {
  return localStorage.getItem(SELECTED_PROFILE_KEY)
}

export function getPendingWorkouts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    logger.warn('offline_storage.pending_workouts_parse_failed', {
      storageKey: PENDING_KEY,
      error
    })
    return []
  }
}

export function addPendingWorkout(payload, ownerUserId) {
  if (!ownerUserId) {
    logger.warn('offline_storage.pending_workout_owner_missing')
    throw new Error('Não foi possível identificar a conta para o salvamento offline.')
  }

  const item = { ...payload, ownerUserId, offlineId: crypto.randomUUID() }
  if (JSON.stringify(item).length > MAX_PENDING_BYTES) {
    logger.warn('offline_storage.pending_workout_size_exceeded', {
      userId: ownerUserId,
      maxBytes: MAX_PENDING_BYTES
    })
    throw new Error('Treino offline excede o limite seguro do aparelho.')
  }
  const current = getPendingWorkouts()
  if (current.length >= MAX_PENDING_WORKOUTS) {
    throw new Error('Limite de 20 treinos offline atingido. Sincronize os treinos pendentes antes de continuar.')
  }
  localStorage.setItem(PENDING_KEY, JSON.stringify([...current, item]))
}

export function replacePendingWorkouts(items) {
  if (!Array.isArray(items)) throw new Error('Fila offline inválida.')
  // Preserve entries added while the async synchronization was running.
  if (items.length > MAX_PENDING_WORKOUTS) throw new Error('Fila offline acima do limite seguro.')
  localStorage.setItem(PENDING_KEY, JSON.stringify(items))
}

export function clearPendingWorkouts() {
  localStorage.removeItem(PENDING_KEY)
}

export function clearSelectedProfile() {
  localStorage.removeItem(SELECTED_PROFILE_KEY)
}

export function clearWorkoutStorage() {
  localStorage.removeItem(PENDING_KEY)
  clearSelectedProfile()
}
