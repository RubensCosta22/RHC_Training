import { describe, expect, it } from 'vitest'
import { parsePositiveNumber, sanitizeText, validateWorkoutInput } from './validation'

describe('validation', () => {
  it('rejeita numeros negativos', () => {
    expect(() => parsePositiveNumber(-1, 'Carga')).toThrow('negativo')
  })

  it('remove marcadores perigosos de texto', () => {
    expect(sanitizeText('<script>javascript:onerror=teste</script>')).not.toMatch(/[<>]/)
  })

  it('mantem academia obrigatoria', () => {
    expect(() => validateWorkoutInput({ gymName: '', durationMinutes: 60, notes: '' }))
      .toThrow('Informe a academia')
  })
})
