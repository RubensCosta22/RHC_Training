export const WORKOUT_TYPES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F'])

export function isWorkoutType(value) {
  return WORKOUT_TYPES.includes(String(value || '').toUpperCase())
}

export function normalizeWorkoutTypes(values = []) {
  const unique = new Set((values || []).map((value) => String(value || '').toUpperCase()))
  return WORKOUT_TYPES.filter((type) => unique.has(type))
}
