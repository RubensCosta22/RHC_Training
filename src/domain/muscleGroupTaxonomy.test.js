import { describe, expect, it } from 'vitest'
import { CANONICAL_MUSCLE_GROUPS, isCanonicalMuscleGroup, normalizeMuscleGroup } from './muscleGroupTaxonomy'

describe('muscleGroupTaxonomy', () => {
  it('normalizes legacy casing and singular forms', () => {
    expect(normalizeMuscleGroup('core')).toBe('Core')
    expect(normalizeMuscleGroup('Ombro')).toBe('Ombros')
    expect(normalizeMuscleGroup('Posterior')).toBe('Posteriores')
    expect(normalizeMuscleGroup('Panturrilha')).toBe('Panturrilhas')
  })

  it('normalizes broad legacy lower-limb label used by current plans', () => {
    expect(normalizeMuscleGroup('Pernas')).toBe('Quadríceps')
  })

  it('does not turn movement patterns or categories into muscle groups', () => {
    expect(normalizeMuscleGroup('empurrar_horizontal')).toBeNull()
    expect(normalizeMuscleGroup('flexao_joelho')).toBeNull()
    expect(normalizeMuscleGroup('Cardio')).toBeNull()
    expect(normalizeMuscleGroup('Mobilidade')).toBeNull()
  })

  it('recognizes only canonical values after normalization', () => {
    for (const item of CANONICAL_MUSCLE_GROUPS) expect(isCanonicalMuscleGroup(item)).toBe(true)
    expect(isCanonicalMuscleGroup('core')).toBe(false)
  })
})
