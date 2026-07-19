import { describe, expect, it } from 'vitest'
import { parsePositiveNumber, sanitizeText, validateNewPassword, validateWorkoutInput } from './validation'

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

  it('valida uma nova senha forte e confirmada', () => {
    expect(validateNewPassword('Treino2026', 'Treino2026')).toBe('Treino2026')
    expect(() => validateNewPassword('fraca', 'fraca')).toThrow('8 caracteres')
    expect(() => validateNewPassword('Treino2026', 'Outra2026')).toThrow('nao coincidem')
  })
})
