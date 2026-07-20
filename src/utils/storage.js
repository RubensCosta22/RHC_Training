const PENDING_KEY = 'mtp_pending_workouts'
const SELECTED_PROFILE_KEY = 'mtp_selected_profile_id'

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
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
  } catch {
    return []
  }
}

export function addPendingWorkout(payload, ownerUserId) {
  if (!ownerUserId) {
    throw new Error('Nao foi possivel identificar a conta para o salvamento offline.')
  }

  const current = getPendingWorkouts()
  localStorage.setItem(PENDING_KEY, JSON.stringify([
    ...current,
    { ...payload, ownerUserId, offlineId: crypto.randomUUID() }
  ]))
}

export function replacePendingWorkouts(items) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items))
}

export function clearPendingWorkouts() {
  localStorage.removeItem(PENDING_KEY)
}

export function clearWorkoutStorage() {
  localStorage.removeItem(PENDING_KEY)
  localStorage.removeItem(SELECTED_PROFILE_KEY)
}
