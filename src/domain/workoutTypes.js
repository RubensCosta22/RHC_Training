export const WORKOUT_TYPES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G'])

export function isWorkoutType(value) {
  return WORKOUT_TYPES.includes(String(value || '').toUpperCase())
}

export function normalizeWorkoutTypes(values = []) {
  const unique = new Set((values || []).map((value) => String(value || '').toUpperCase()))
  return WORKOUT_TYPES.filter((type) => unique.has(type))
}

export function isRunningWorkout(session) {
  if (session?.session?.session_type) return session.session.session_type === 'running'
  const code = session?.workout_type || session?.workout_code || session
  return ['E', 'G'].includes(code) && !(session?.workout_exercises?.length > 0)
}
