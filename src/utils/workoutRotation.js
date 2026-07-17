export function getNextWorkoutType(lastWorkoutType, availableTypes = []) {
  if (!availableTypes.length) return 'A'
  if (!lastWorkoutType) return availableTypes[0]

  const currentIndex = availableTypes.indexOf(lastWorkoutType)
  if (currentIndex === -1) return availableTypes[0]

  return availableTypes[(currentIndex + 1) % availableTypes.length]
}
