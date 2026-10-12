import { describe, expect, it } from 'vitest'
import { getNextWorkoutType, getSuggestedWorkoutType, getProgramWorkoutProgress } from './workoutRotation'

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

  it('advances A to B even when the calendar still says A on Monday', () => {
    expect(getSuggestedWorkoutType({ ...input, schedule: { configured: true, workoutType: 'A' }, programStart: { ...input.programStart, hasStarted: true, lastWorkoutType: 'A' } })).toBe('B')
  })

  it.each(availableTypes)('advances after %s using the active cycle order', code => {
    const next = availableTypes[(availableTypes.indexOf(code) + 1) % availableTypes.length]
    expect(getSuggestedWorkoutType({ ...input, programStart: { workoutTypes: availableTypes, lastWorkoutType: code } })).toBe(next)
  })

  it('preserves calendar and rest days without an active program', () => {
    expect(getSuggestedWorkoutType({ ...input, programStart: null })).toBe('F')
    expect(getSuggestedWorkoutType({ ...input, programStart: null, schedule: { configured: true, workoutType: null } })).toBeNull()
  })

  it('preserves rotation without a calendar or an active program', () => {
    expect(getSuggestedWorkoutType({ ...input, programStart: null, schedule: { configured: false } })).toBe('F')
  })
})

describe('active cycle executions', () => {
  const sessions = ['A','B','C','D','E','F','G'].map(code => ({ code, session_type: ['E','G'].includes(code) ? 'running' : 'strength' }))
  const saved = (code, enrollment = 'new', sets = 3) => ({ workout_code: code, program_exercise_exposures: [{ enrollment_id: enrollment, completed_sets: sets }] })

  it('ignores previous-cycle executions and unfinished sets', () => {
    expect(getProgramWorkoutProgress(sessions, [saved('F','old'), saved('C','new',0)], 'new').lastWorkoutType).toBeNull()
  })

  it('uses the latest saved strength workout from this enrollment', () => {
    const progress = getProgramWorkoutProgress(sessions, [saved('F','old'), saved('A')], 'new')
    expect(progress.lastWorkoutType).toBe('A')
    expect(getSuggestedWorkoutType({ programStart: progress, availableTypes: sessions.map(s=>s.code), schedule: { configured: true, workoutType: 'A' } })).toBe('B')
  })

  it.each(['E','G'])('includes a saved run %s without exercise exposures', code => {
    const progress = getProgramWorkoutProgress(sessions, [{workout_code:code}, saved('D')], 'new')
    expect(progress.lastWorkoutType).toBe(code)
  })
})
