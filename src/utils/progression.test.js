import { describe, expect, it } from 'vitest'
import {
  calculateVolume,
  completedAtMaxReps,
  getProgressionSuggestion
} from './progression'

describe('progression', () => {
  it('calcula volume apenas de exercicios concluidos', () => {
    expect(calculateVolume([
      { completed: true, weight: 20, sets: 3, actualReps: '10' },
      { completed: false, weight: 100, sets: 4, actualReps: '8' }
    ])).toBe(600)
  })

  it('reconhece quando o topo da faixa foi atingido', () => {
    expect(completedAtMaxReps('8-12', '12, 12, 12')).toBe(true)
    expect(completedAtMaxReps('8-12', '10, 10, 10')).toBe(false)
  })

  it('nao sugere aumento quando houve dor', () => {
    const suggestion = getProgressionSuggestion(
      { muscleGroup: 'Peito', reps: '8-12' },
      20,
      true,
      'pain',
      '12'
    )

    expect(suggestion).toContain('Dor registrada')
  })
})

it('sums actual reps per set and excludes seconds and unperformed sets', () => {
  expect(calculateVolume([{ completed: true, weight: 20, sets: 3, actualReps: '10/9/8' }])).toBe(540)
  expect(calculateVolume([{ completed: false, weight: 20, sets: 3, setReps: [10,9,8], completedSets: [true,false,false] }])).toBe(200)
  expect(calculateVolume([{ completed: true, weight: 16, sets: 2, actualReps: '40/40', reps: '20-40 s' }])).toBe(0)
  expect(calculateVolume([{ completed: true, weight: 20, sets: 3, reps: '8-12' }])).toBe(0)
})
