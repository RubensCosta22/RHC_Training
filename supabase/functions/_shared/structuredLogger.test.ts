import { describe, expect, it, vi } from 'vitest'
import { structuredLogger } from './structuredLogger.ts'

describe('edge structured logger', () => {
  it('redacts sensitive fields and embedded secrets', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    structuredLogger.error('security.test', {
      requestId: 'request-1',
      userId: 'user-1',
      password: 'never-log-password',
      authorization: 'Bearer never-log-token',
      nested: { refresh_token: 'never-log-refresh' },
      error: new Error('failure for person@example.com Bearer embedded-token access_token=embedded-secret')
    })

    const output = String(spy.mock.calls[0]?.[0] || '')
    expect(output).not.toContain('never-log-password')
    expect(output).not.toContain('never-log-token')
    expect(output).not.toContain('never-log-refresh')
    expect(output).not.toContain('person@example.com')
    expect(output).not.toContain('embedded-token')
    expect(output).not.toContain('embedded-secret')
    expect(output).toContain('[REDACTED]')

    spy.mockRestore()
  })
})
