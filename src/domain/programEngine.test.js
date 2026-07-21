import { describe, expect, it } from 'vitest'
import { evaluateDoubleProgression, evaluateLoadProgression, getProgramWeek } from './programEngine'

describe('programEngine', () => {
  it('aumenta a carga quando a meta e o RPE sao atingidos', () => {
    expect(evaluateLoadProgression({
      currentLoad: 60,
      completedSets: 5,
      targetSets: 5,
      reps: [5, 5, 5, 5, 5],
      repsMin: 5,
      observedRpe: 8,
      targetRpeMax: 8,
      loadIncrement: 2.5
    })).toMatchObject({ action: 'increase', suggestedLoad: 62.5 })
  })

  it('mantem a carga apos uma falha isolada', () => {
    expect(evaluateLoadProgression({
      currentLoad: 60,
      completedSets: 5,
      targetSets: 5,
      reps: [5, 5, 5, 5, 4],
      repsMin: 5,
      failedExposureCount: 0,
      failuresBeforeRegression: 2,
      loadIncrement: 2.5
    })).toMatchObject({ action: 'hold', suggestedLoad: 60 })
  })

  it('sugere regressao apos falhas consecutivas', () => {
    expect(evaluateLoadProgression({
      currentLoad: 80,
      completedSets: 4,
      targetSets: 5,
      reps: [5, 5, 4, 4],
      repsMin: 5,
      failedExposureCount: 1,
      failuresBeforeRegression: 2,
      regressionPercent: 7.5,
      loadIncrement: 2.5
    })).toMatchObject({ action: 'regress', suggestedLoad: 75 })
  })

  it('usa double progression nos acessorios', () => {
    expect(evaluateDoubleProgression({
      currentLoad: 30,
      reps: [10, 10, 10],
      targetSets: 3,
      repsMax: 10,
      observedRpe: 8,
      targetRpeMax: 8,
      loadIncrement: 2
    })).toMatchObject({ action: 'increase', suggestedLoad: 32 })
  })

  it('calcula a semana do programa sem avancar antes de sete dias', () => {
    expect(getProgramWeek('2026-07-21', new Date('2026-07-27T10:00:00'))).toBe(1)
    expect(getProgramWeek('2026-07-21', new Date('2026-07-28T10:00:00'))).toBe(2)
  })
})
