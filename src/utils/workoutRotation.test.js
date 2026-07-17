import { describe, expect, it } from 'vitest'
import { getNextWorkoutType } from './workoutRotation'

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
