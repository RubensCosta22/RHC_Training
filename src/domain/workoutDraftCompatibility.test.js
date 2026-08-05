import { describe, expect, it } from 'vitest'
import { classifyWorkoutDraftCompatibility, mapDraftExerciseValues } from './workoutDraftCompatibility'

describe('workout draft compatibility', () => {
  it('allows automatic restore only for the same plan fingerprint', () => {
    expect(classifyWorkoutDraftCompatibility({ planFingerprint: 'A|x' }, 'A|x')).toEqual({
      status: 'compatible',
      canRestoreAutomatically: true
    })
    expect(classifyWorkoutDraftCompatibility({ planFingerprint: 'A|old' }, 'A|new')).toEqual({
      status: 'plan_changed',
      canRestoreAutomatically: false
    })
  })

  it('maps by stable id before controlled name and never by array position', () => {
    const workout = {
      exercises: [
        { id: 'new-1', programExerciseId: 'program-1', name: 'Barra fixa', alternatives: ['Graviton'] },
        { id: 'new-2', name: 'Remada', alternatives: [] }
      ]
    }
    const byStableId = { originalName: 'Nome antigo', selectedName: 'Graviton', weight: '20' }
    const byName = { originalName: 'Remada', selectedName: 'Remada', weight: '40' }
    const removed = { originalName: 'Exercício removido', selectedName: 'Exercício removido', weight: '10' }
    const result = mapDraftExerciseValues(workout, {
      'program-1': byStableId,
      legacyRemada: byName,
      removed: removed
    })

    expect(result.mapped['new-1']).toBe(byStableId)
    expect(result.mapped['new-2']).toBe(byName)
    expect(result.unapplied).toEqual([
      expect.objectContaining({ key: 'removed', originalName: 'Exercício removido' })
    ])
  })
})
