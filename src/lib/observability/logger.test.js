import { describe, expect, it, vi } from 'vitest'
import { logger, sanitizeLogValue } from './logger'

describe('observability logger', () => {
  it('redacts sensitive fields recursively', () => {
    const value = sanitizeLogValue({
      userId: 'user-123',
      password: 'super-secret',
      nested: {
        access_token: 'jwt-value',
        authorization: 'Bearer abc',
        email: 'person@example.com',
        safe: 'visible'
      }
    })

    expect(value).toEqual({
      userId: 'user-123',
      password: '[REDACTED]',
      nested: {
        access_token: '[REDACTED]',
        authorization: '[REDACTED]',
        email: '[REDACTED]',
        safe: 'visible'
      }
    })
  })

  it('redacts sensitive values embedded in strings', () => {
    const value = sanitizeLogValue({
      message: 'failed for person@example.com with Bearer abc.def.ghi and access_token=secret-value'
    })

    expect(value.message).not.toContain('person@example.com')
    expect(value.message).not.toContain('abc.def.ghi')
    expect(value.message).not.toContain('secret-value')
  })

  it('never serializes known secrets', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.error('auth.login.failed', {
      userId: 'user-123',
      password: 'do-not-log-me',
      token: 'token-do-not-log-me',
      error: new Error('invalid credentials')
    })

    const serialized = spy.mock.calls[0][0]
    expect(serialized).not.toContain('do-not-log-me')
    expect(serialized).not.toContain('token-do-not-log-me')
    expect(serialized).toContain('[REDACTED]')
    spy.mockRestore()
  })
})
