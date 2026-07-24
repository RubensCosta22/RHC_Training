import { logger, createRequestId } from '../lib/observability/logger'

const RECOVERY_KEY = 'rhc_password_recovery'

export function isPasswordRecoveryUrl(location = typeof window !== 'undefined' ? window.location : {}) {
  const query = new URLSearchParams(location.search || '')
  const hash = new URLSearchParams(String(location.hash || '').replace(/^#/, ''))
  return query.get('type') === 'recovery' || hash.get('type') === 'recovery'
}

export function markPasswordRecovery(session = null) {
  sessionStorage.setItem(RECOVERY_KEY, JSON.stringify({
    userId: session?.user?.id || null,
    expiresAt: session?.expires_at || Math.floor(Date.now() / 1000) + 600
  }))
}

export function clearPasswordRecovery() {
  sessionStorage.removeItem(RECOVERY_KEY)
}

export function hasPasswordRecovery(session) {
  try {
    const marker = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || 'null')
    return Boolean(
      session?.user?.id && marker?.userId === session.user.id &&
      Number(marker.expiresAt || 0) >= Math.floor(Date.now() / 1000)
    )
  } catch (error) {
    logger.warn('auth.password_recovery_marker_parse_failed', {
      requestId: createRequestId(),
      userId: session?.user?.id || undefined,
      error
    })
    return false
  }
}
