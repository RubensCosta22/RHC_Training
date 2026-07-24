const sensitiveKeyPattern = /(password|passwd|secret|token|authorization|cookie|api[-_]?key|service[-_]?role|jwt|session|credential|email|phone|cpf|birth[-_]?date|address)/i
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const bearerPattern = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi
const secretAssignmentPattern = /\b(access_token|refresh_token|token|password|secret|api_key|apikey)=([^\s&]+)/gi

function redactString(value: string) {
  return value
    .slice(0, 1000)
    .replace(emailPattern, '[REDACTED_EMAIL]')
    .replace(bearerPattern, 'Bearer [REDACTED]')
    .replace(secretAssignmentPattern, '$1=[REDACTED]')
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return redactString(value)
  if (depth >= 6) return '[MAX_DEPTH]'

  if (value instanceof Error) {
    const errorWithCode = value as Error & { code?: string }
    return {
      name: value.name,
      message: redactString(String(value.message || 'unknown error')),
      code: errorWithCode.code ? redactString(String(errorWithCode.code)) : undefined
    }
  }

  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1))
  if (typeof value !== 'object') return redactString(String(value))

  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = sensitiveKeyPattern.test(key) ? '[REDACTED]' : sanitize(item, depth + 1)
  }
  return output
}

type Level = 'info' | 'warn' | 'error' | 'fatal'

function emit(level: Level, action: string, context: Record<string, unknown> = {}) {
  const entry = sanitize({
    timestamp: new Date().toISOString(),
    level,
    service: 'rhc-training-edge',
    action,
    ...context
  })
  const serialized = JSON.stringify(entry)
  if (level === 'error' || level === 'fatal') console.error(serialized)
  else if (level === 'warn') console.warn(serialized)
  else console.info(serialized)
}

export const structuredLogger = {
  info: (action: string, context?: Record<string, unknown>) => emit('info', action, context),
  warn: (action: string, context?: Record<string, unknown>) => emit('warn', action, context),
  error: (action: string, context?: Record<string, unknown>) => emit('error', action, context),
  fatal: (action: string, context?: Record<string, unknown>) => emit('fatal', action, context)
}
