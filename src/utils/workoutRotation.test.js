import { describe, expect, it } from 'vitest'
import { getNextWorkoutType, getSuggestedWorkoutType } from './workoutRotation'

describe('workout rotation', () => {
  const henriqueTypes = ['A', 'B', 'C', 'D', 'E']

  it('avanca do treino C para o D', () => {
    expect(getNextWorkoutType('C', henriqueTypes)).toBe('D')
  })

  it('avanca do treino D para o E', () => {
    expect(getNextWorkoutType('D', henriqueTypes)).toBe('E')
  })

  it('reinicia no A depois do E', () => {
    expect(getNextWorkoutType('E', henriqueTypes)).toBe('A')
  })
})

describe('new cycle suggestion', () => {
  const availableTypes = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  const input = {
    availableTypes,
    lastWorkoutType: 'E',
    schedule: { configured: true, workoutType: 'F' },
    programStart: { firstWorkoutType: 'A', hasStarted: false }
  }

  it('starts at A even on Saturday and with previous-cycle history', () => {
    expect(getSuggestedWorkoutType(input)).toBe('A')
  })

  it('starts at A even on a scheduled rest day', () => {
    expect(getSuggestedWorkoutType({ ...input, schedule: { configured: true, workoutType: null } })).toBe('A')
  })

  it('follows the calendar once the active cycle has started', () => {
    expect(getSuggestedWorkoutType({ ...input, programStart: { ...input.programStart, hasStarted: true } })).toBe('F')
  })

  it('preserves calendar and rest days without an active program', () => {
    expect(getSuggestedWorkoutType({ ...input, programStart: null })).toBe('F')
    expect(getSuggestedWorkoutType({ ...input, programStart: null, schedule: { configured: true, workoutType: null } })).toBeNull()
  })

  it('preserves rotation without a calendar or an active program', () => {
    expect(getSuggestedWorkoutType({ ...input, programStart: null, schedule: { configured: false } })).toBe('F')
  })
})
