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
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PENDING_WORKOUTS) : []
  } catch {
    return []
  }
}

export function addPendingWorkout(payload, ownerUserId) {
  if (!ownerUserId) {
    throw new Error('Nao foi possivel identificar a conta para o salvamento offline.')
  }

  const item = { ...payload, ownerUserId, offlineId: crypto.randomUUID() }
  if (JSON.stringify(item).length > MAX_PENDING_BYTES) {
    throw new Error('Treino offline excede o limite seguro do aparelho.')
  }
  const current = getPendingWorkouts()
  localStorage.setItem(PENDING_KEY, JSON.stringify([
    ...current.slice(-(MAX_PENDING_WORKOUTS - 1)), item
  ]))
}

export function replacePendingWorkouts(items) {
  const safeItems = Array.isArray(items) ? items.slice(0, MAX_PENDING_WORKOUTS) : []
  localStorage.setItem(PENDING_KEY, JSON.stringify(safeItems))
}

export function clearPendingWorkouts() {
  localStorage.removeItem(PENDING_KEY)
}

export function clearWorkoutStorage() {
  localStorage.removeItem(PENDING_KEY)
  localStorage.removeItem(SELECTED_PROFILE_KEY)
}
