import { describe, expect, it } from 'vitest'
import { friendlyError, normalizeEmail, parsePositiveNumber, sanitizeText, validateNewPassword, validateUuid, validateWorkoutInput } from './validation'

describe('validation', () => {
  it('rejeita numeros negativos e nao finitos', () => {
    expect(() => parsePositiveNumber(-1, 'Carga')).toThrow('negativo')
    expect(() => parsePositiveNumber('Infinity', 'Carga')).toThrow('negativo')
  })

  it('remove marcadores perigosos de texto', () => {
    expect(sanitizeText('<script>javascript:onerror=teste</script>')).not.toMatch(/[<>]/)
  })

  it('normaliza e valida e-mail antes de autenticação ou convite', () => {
    expect(normalizeEmail('  Pessoa@Example.COM ')).toBe('pessoa@example.com')
    expect(() => normalizeEmail('email-invalido')).toThrow('e-mail valido')
    expect(() => normalizeEmail(`${'a'.repeat(250)}@x.com`)).toThrow('e-mail valido')
  })

  it('valida UUIDs usados em RPCs sensiveis', () => {
    expect(validateUuid('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(() => validateUuid("' OR 1=1 --", 'Perfil')).toThrow('Perfil inválido')
  })

  it('mantem academia obrigatoria', () => {
    expect(() => validateWorkoutInput({ gymName: '', durationMinutes: 60, notes: '' }))
      .toThrow('Informe a academia')
  })

  it('valida uma nova senha forte e confirmada', () => {
    expect(validateNewPassword('Treino2026', 'Treino2026')).toBe('Treino2026')
    expect(() => validateNewPassword('fraca', 'fraca')).toThrow('8 caracteres')
    expect(() => validateNewPassword('Treino2026', 'Outra2026')).toThrow('não coincidem')
  })

  it('traduz bloqueio por excesso de tentativas', () => {
    expect(friendlyError(new Error('rate limit exceeded'))).toContain('Muitas tentativas')
  })
})
