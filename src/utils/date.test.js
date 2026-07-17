import { describe, expect, it } from 'vitest'
import { parseLocalDate, toLocalDateKey } from './date'

describe('date helpers', () => {
  it('preserva uma data civil sem converter para UTC', () => {
    const parsed = parseLocalDate('2026-07-17')

    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(6)
    expect(parsed.getDate()).toBe(17)
    expect(toLocalDateKey(parsed)).toBe('2026-07-17')
  })
})
