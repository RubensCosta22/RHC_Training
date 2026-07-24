import { assertEquals } from 'jsr:@std/assert@1'
import { structuredLogger } from './structuredLogger.ts'

Deno.test('structured logger redacts sensitive fields', () => {
  const originalError = console.error
  let output = ''
  console.error = (message?: unknown) => { output = String(message ?? '') }

  try {
    structuredLogger.error('security.test', {
      requestId: 'request-1',
      userId: 'user-1',
      password: 'never-log-password',
      authorization: 'Bearer never-log-token',
      nested: { refresh_token: 'never-log-refresh' }
    })

    assertEquals(output.includes('never-log-password'), false)
    assertEquals(output.includes('never-log-token'), false)
    assertEquals(output.includes('never-log-refresh'), false)
    assertEquals(output.includes('[REDACTED]'), true)
  } finally {
    console.error = originalError
  }
})
