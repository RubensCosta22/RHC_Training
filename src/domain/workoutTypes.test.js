import { expect, it } from 'vitest'
import { normalizeWorkoutTypes, isRunningWorkout } from './workoutTypes'
it('includes G and distinguishes a legacy E lifting session from a run', () => {
  expect(normalizeWorkoutTypes(['G','F','A'])).toEqual(['A','F','G'])
  expect(isRunningWorkout({ workout_type: 'E', workout_exercises: [{}] })).toBe(false)
  expect(isRunningWorkout({ session: { session_type: 'strength', code: 'E' } })).toBe(false)
  expect(isRunningWorkout({ session: { session_type: 'running', code: 'G' } })).toBe(true)
})
