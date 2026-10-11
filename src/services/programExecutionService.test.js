import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/supabaseClient', () => ({ supabase: {} }))
import { calculateProgramSuggestion, countFailedExposures } from './programExecutionService'
const exercise = { sets: 3, repsMin: 4, repsMax: 6, targetRpeMax: 8, loadIncrement: 2.5, progressionType: 'double_progression' }
const value = { weight: 65, setReps: [6, 6, 6], completedSets: [true, true, true], rpe: 8 }
describe('cycle progression', () => {
  it('only increases with all completed sets, all top reps and recorded effort', () => {
    expect(calculateProgramSuggestion(exercise, value).suggestedLoad).toBe(67.5)
    for (const patch of [{ setReps: [6, '', 6] }, { completedSets: [true, false, true] }, { rpe: '' }, { weight: '' }]) {
      expect(calculateProgramSuggestion(exercise, { ...value, ...patch }).action).toBe('hold')
    }
  })
  it('does not increase in deload or when cycle has ended', () => {
    expect(calculateProgramSuggestion({ ...exercise, progressionPaused: true }, value).action).toBe('hold')
  })
  it('does not treat seconds or bodyweight as kg progression', () => {
    expect(calculateProgramSuggestion({ ...exercise, executionMode: 'timed' }, value)).toMatchObject({ action: 'manual', suggestedLoad: null })
    expect(calculateProgramSuggestion({ ...exercise, executionMode: 'bodyweight' }, { ...value, weight: 0 })).toMatchObject({ action: 'manual', suggestedLoad: 0 })
  })
  it('does not count a successful hold or an incomplete record as failure', () => {
    const success = { completed_sets: 3, reps: [5, 5, 5], observed_rpe: 8, progression_action: 'hold' }
    expect(countFailedExposures([success], exercise)).toBe(0)
    expect(countFailedExposures([{ ...success, reps: [3, 3, 3] }, { ...success, observed_rpe: null }], exercise)).toBe(1)
  })
})
