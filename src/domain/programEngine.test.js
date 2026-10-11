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
      completedSets: 5,
      targetSets: 5,
      reps: [5, 5, 5, 4, 4],
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
      completedSets: 3,
      targetSets: 3,
      repsMax: 10,
      observedRpe: 8,
      targetRpeMax: 8,
      loadIncrement: 2
    })).toMatchObject({ action: 'increase', suggestedLoad: 32 })
  })

  it('nao aumenta carga quando RPE exigido nao foi informado', () => {
    expect(evaluateLoadProgression({
      currentLoad: 60, completedSets: 3, targetSets: 3,
      reps: [8, 8, 8], repsMin: 8, targetRpeMax: 8,
      observedRpe: null, loadIncrement: 2.5
    }).action).toBe('hold')
  })

  it('nao aumenta carga com series incompletas na progressao dupla', () => {
    expect(evaluateDoubleProgression({
      currentLoad: 30, completedSets: 2, targetSets: 3,
      reps: [10, 10, 10], repsMax: 10,
      observedRpe: 8, targetRpeMax: 8, loadIncrement: 2
    }).action).toBe('hold')
  })

  it('nao aceita series vazias como meta atingida', () => {
    expect(evaluateDoubleProgression({
      currentLoad: 30, completedSets: 3, targetSets: 3,
      reps: [10, '', 10], repsMax: 10,
      observedRpe: 8, targetRpeMax: 8, loadIncrement: 2
    }).action).toBe('hold')
  })

  it('nao regride carga quando faltam series mesmo apos falha anterior', () => {
    expect(evaluateLoadProgression({
      currentLoad: 80, completedSets: 2, targetSets: 3,
      reps: [8, 8], repsMin: 8, targetRpeMax: 8,
      observedRpe: 8, failedExposureCount: 1,
      failuresBeforeRegression: 2, loadIncrement: 2.5
    })).toMatchObject({ action: 'hold', suggestedLoad: 80 })
  })

  it('nao regride carga quando o RPE esta ausente', () => {
    expect(evaluateLoadProgression({
      currentLoad: 80, completedSets: 3, targetSets: 3,
      reps: [8, 8, 7], repsMin: 8, targetRpeMax: 8,
      observedRpe: null, failedExposureCount: 1,
      failuresBeforeRegression: 2, loadIncrement: 2.5
    })).toMatchObject({ action: 'hold', suggestedLoad: 80 })
  })

  it('calcula a semana do programa sem avancar antes de sete dias', () => {
    expect(getProgramWeek('2026-07-21', new Date('2026-07-27T10:00:00'))).toBe(1)
    expect(getProgramWeek('2026-07-21', new Date('2026-07-28T10:00:00'))).toBe(2)
  })
})
