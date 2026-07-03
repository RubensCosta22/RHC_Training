const FAVORITES_KEY = 'rhc_exercise_favorites'
const GYMS_KEY = 'rhc_favorite_gyms'

export function getFavoriteExercise(profileId, exerciseName) {
  const data = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}')
  return data?.[profileId]?.[exerciseName] || null
}

export function saveFavoriteExercise(profileId, exerciseName, selectedName) {
  const data = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}')
  data[profileId] = data[profileId] || {}
  data[profileId][exerciseName] = selectedName
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(data))
}

export function removeFavoriteExercise(profileId, exerciseName) {
  const data = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}')
  if (data?.[profileId]) delete data[profileId][exerciseName]
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(data))
}

export function getFavoriteGyms() {
  return JSON.parse(localStorage.getItem(GYMS_KEY) || '[]')
}

export function saveFavoriteGym(gymName) {
  const clean = String(gymName || '').trim()
  if (!clean) return

  const gyms = getFavoriteGyms()
  const next = [clean, ...gyms.filter((gym) => gym !== clean)].slice(0, 5)
  localStorage.setItem(GYMS_KEY, JSON.stringify(next))
}