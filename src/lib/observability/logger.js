const SENSITIVE_KEY_PATTERN = /(password|passwd|secret|token|authorization|cookie|api[-_]?key|service[-_]?role|jwt|session|credential|email|phone|cpf|birth[-_]?date|address)/i
const MAX_DEPTH = 6
const MAX_STRING_LENGTH = 1000

function redactString(value) {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value
}

export function sanitizeLogValue(value, depth = 0, seen = new WeakSet()) {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return redactString(value)
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function' || typeof value === 'symbol') return undefined
  if (depth >= MAX_DEPTH) return '[MAX_DEPTH]'

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(String(value.message || 'unknown error')),
      code: value.code ? redactString(String(value.code)) : undefined
    }
  }

  if (typeof value !== 'object') return redactString(String(value))
  if (seen.has(value)) return '[CIRCULAR]'
  seen.add(value)

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeLogValue(item, depth + 1, seen))
  }

  const output = {}
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = '[REDACTED]'
      continue
    }
    const sanitized = sanitizeLogValue(item, depth + 1, seen)
    if (sanitized !== undefined) output[key] = sanitized
  }
  return output
}

export function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function emit(level, action, context = {}) {
  const entry = sanitizeLogValue({
    timestamp: new Date().toISOString(),
    level,
    service: 'rhc-training-web',
    environment: import.meta.env.MODE || 'unknown',
    action,
    ...context
  })

  const serialized = JSON.stringify(entry)
  if (level === 'fatal' || level === 'error') console.error(serialized)
  else if (level === 'warn') console.warn(serialized)
  else console.info(serialized)

  return entry
}

export const logger = {
  info(action, context) {
    return emit('info', action, context)
  },
  warn(action, context) {
    return emit('warn', action, context)
  },
  error(action, context) {
    return emit('error', action, context)
  },
  fatal(action, context) {
    return emit('fatal', action, context)
  }
}
