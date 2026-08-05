export const GPS_LIMITS = Object.freeze({
  maxAccuracyMeters: 40,
  minIntervalMs: 1000,
  maxPlausibleSpeedMetersPerSecond: 8.5,
  minSegmentMeters: 2
})

const EARTH_RADIUS_METERS = 6371000

function toRadians(value) {
  return (Number(value) * Math.PI) / 180
}

export function calculateDistanceMeters(a, b) {
  if (!a || !b) return 0
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const deltaLat = toRadians(Number(b.latitude) - Number(a.latitude))
  const deltaLon = toRadians(Number(b.longitude) - Number(a.longitude))
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

export function acceptGpsPoint(previous, next, limits = GPS_LIMITS) {
  if (!next || !Number.isFinite(Number(next.latitude)) || !Number.isFinite(Number(next.longitude))) {
    return { accepted: false, reason: 'invalid' }
  }
  if (Number(next.accuracy || Infinity) > limits.maxAccuracyMeters) {
    return { accepted: false, reason: 'accuracy' }
  }
  if (!previous) return { accepted: true, distanceMeters: 0 }

  const elapsedMs = Number(next.timestamp) - Number(previous.timestamp)
  if (!Number.isFinite(elapsedMs) || elapsedMs < limits.minIntervalMs) {
    return { accepted: false, reason: 'interval' }
  }

  const distanceMeters = calculateDistanceMeters(previous, next)
  if (distanceMeters < limits.minSegmentMeters) {
    return { accepted: false, reason: 'noise' }
  }

  const speed = distanceMeters / (elapsedMs / 1000)
  if (speed > limits.maxPlausibleSpeedMetersPerSecond) {
    return { accepted: false, reason: 'speed' }
  }

  return { accepted: true, distanceMeters }
}

export function accumulateGpsPoint(state = {}, nextPoint, limits = GPS_LIMITS) {
  const previousPoint = state.lastPoint || null
  const result = acceptGpsPoint(previousPoint, nextPoint, limits)
  if (!result.accepted) {
    return {
      accepted: false,
      reason: result.reason,
      lastPoint: previousPoint,
      distanceMeters: Math.max(0, Number(state.distanceMeters) || 0)
    }
  }

  return {
    accepted: true,
    reason: null,
    lastPoint: nextPoint,
    distanceMeters: Math.max(0, Number(state.distanceMeters) || 0) + Number(result.distanceMeters || 0)
  }
}

export function calculatePaceSecondsPerKm(distanceMeters, durationSeconds) {
  const distance = Number(distanceMeters)
  const duration = Number(durationSeconds)
  if (!(distance > 0) || !(duration > 0)) return null
  return Math.round(duration / (distance / 1000))
}

export function formatDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

export function formatPace(secondsPerKm) {
  if (!(Number(secondsPerKm) > 0)) return '—'
  const total = Math.round(Number(secondsPerKm))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} min/km`
}

export function getElapsedSeconds(timer, now = Date.now()) {
  const accumulated = Math.max(0, Number(timer?.accumulatedSeconds) || 0)
  if (timer?.status !== 'running' || !timer?.startedAt) return Math.floor(accumulated)
  const live = Math.max(0, (now - Date.parse(timer.startedAt)) / 1000)
  return Math.floor(accumulated + live)
}

export function startTimer(timer = {}, now = new Date()) {
  if (timer.status === 'running') return timer
  return {
    status: 'running',
    accumulatedSeconds: Math.max(0, Number(timer.accumulatedSeconds) || 0),
    startedAt: now.toISOString()
  }
}

export function pauseTimer(timer = {}, now = new Date()) {
  return {
    status: 'paused',
    accumulatedSeconds: getElapsedSeconds(timer, now.getTime()),
    startedAt: null
  }
}

export function resetTimer() {
  return { status: 'idle', accumulatedSeconds: 0, startedAt: null }
}
