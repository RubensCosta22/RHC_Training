export function getNextWorkoutType(lastWorkoutType, availableTypes = []) {
  if (!availableTypes.length) return 'A'
  if (!lastWorkoutType) return availableTypes[0]

  const currentIndex = availableTypes.indexOf(lastWorkoutType)
  if (currentIndex === -1) return availableTypes[0]

  return availableTypes[(currentIndex + 1) % availableTypes.length]
}

export function getSuggestedWorkoutType({ programStart, schedule, lastWorkoutType, availableTypes = [] }) {
  // An active cycle advances by saved executions, never by today's weekday.
  if (programStart) {
    const cycleTypes = (programStart.workoutTypes || availableTypes).filter(code => availableTypes.includes(code))
    if (cycleTypes.length) {
      return getNextWorkoutType(programStart.lastWorkoutType, cycleTypes)
    }
  }
  if (schedule?.configured) return schedule.workoutType
  return getNextWorkoutType(lastWorkoutType, availableTypes)
}

// Workouts arrive newest first, scoped to the profile and activation timestamp.
export function getProgramWorkoutProgress(programSessions, workouts, enrollmentId) {
  const lastWorkout = workouts.find(workout => {
    const session = programSessions.find(item => item.code === workout.workout_code)
    if (!session) return false
    // Running sessions have no strength exposures. Strength must belong to this cycle.
    return session.session_type === 'running' || (workout.program_exercise_exposures || []).some(
      exposure => exposure.enrollment_id === enrollmentId && Number(exposure.completed_sets) > 0
    )
  })
  return {
    firstWorkoutType: programSessions[0]?.code || null,
    workoutTypes: programSessions.map(session => session.code),
    hasStarted: Boolean(lastWorkout),
    lastWorkoutType: lastWorkout?.workout_code || null
  }
}
