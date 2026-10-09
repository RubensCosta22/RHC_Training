import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addPendingWorkout, getPendingWorkouts, replacePendingWorkouts } from './storage'

const values = new Map()
beforeEach(() => {
  values.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  })
  vi.stubGlobal('crypto', { randomUUID: (() => { let id = 0; return () => String(++id) })() })
})

describe('fila de treinos offline', () => {
  it('preserva os 20 treinos existentes quando a fila chega ao limite', () => {
    for (let index = 0; index < 20; index++) addPendingWorkout({ draftId: String(index) }, 'user')
    expect(() => addPendingWorkout({ draftId: 'extra' }, 'user')).toThrow(/Limite de 20/)
    expect(getPendingWorkouts().map((item) => item.draftId)).toEqual(Array.from({ length: 20 }, (_, i) => String(i)))
  })

  it('preserva registros adicionados apos o inicio da sincronizacao', () => {
    addPendingWorkout({ draftId: 'original' }, 'user')
    const original = getPendingWorkouts()[0]
    addPendingWorkout({ draftId: 'novo' }, 'user')
    replacePendingWorkouts([], [original.offlineId])
    expect(getPendingWorkouts().map((item) => item.draftId)).toEqual(['novo'])
  })

  it('preserva registros que falharam junto com novas adicoes', () => {
    addPendingWorkout({ draftId: 'falhou' }, 'user')
    const failed = getPendingWorkouts()[0]
    addPendingWorkout({ draftId: 'novo' }, 'user')
    replacePendingWorkouts([failed], [failed.offlineId])
    expect(getPendingWorkouts().map((item) => item.draftId)).toEqual(['falhou', 'novo'])
  })

  it('mantem a fila completa ao substituir registros validos', () => {
    addPendingWorkout({ draftId: 'a' }, 'user')
    const first = getPendingWorkouts()[0]
    replacePendingWorkouts([first])
    expect(getPendingWorkouts()).toHaveLength(1)
    expect(getPendingWorkouts()[0].draftId).toBe('a')
  })
})
