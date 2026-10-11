export function getNextWorkoutType(lastWorkoutType, availableTypes = []) {
  if (!availableTypes.length) return 'A'
  if (!lastWorkoutType) return availableTypes[0]

  const currentIndex = availableTypes.indexOf(lastWorkoutType)
  if (currentIndex === -1) return availableTypes[0]

  return availableTypes[(currentIndex + 1) % availableTypes.length]
}

export function getSuggestedWorkoutType({ programStart, schedule, lastWorkoutType, availableTypes = [] }) {
  // Previous cycles and today's calendar must not skip the new cycle's first workout.
  if (programStart?.hasStarted === false && availableTypes.includes(programStart.firstWorkoutType)) {
    return programStart.firstWorkoutType
  }
  if (schedule?.configured) return schedule.workoutType
  return getNextWorkoutType(lastWorkoutType, availableTypes)
}
