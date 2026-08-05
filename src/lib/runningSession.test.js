import { describe, expect, it } from 'vitest'
import {
  acceptGpsPoint,
  calculateDistanceMeters,
  calculatePaceSecondsPerKm,
  getElapsedSeconds,
  pauseTimer,
  startTimer
} from './runningSession'

describe('runningSession', () => {
  it('calculates pace in seconds per kilometer', () => {
    expect(calculatePaceSecondsPerKm(10000, 3000)).toBe(300)
    expect(calculatePaceSecondsPerKm(0, 3000)).toBeNull()
  })

  it('derives elapsed time from timestamps and preserves paused time', () => {
    const started = startTimer({}, new Date('2026-08-05T12:00:00.000Z'))
    expect(getElapsedSeconds(started, Date.parse('2026-08-05T12:01:30.000Z'))).toBe(90)
    const paused = pauseTimer(started, new Date('2026-08-05T12:01:30.000Z'))
    expect(paused.accumulatedSeconds).toBe(90)
    expect(getElapsedSeconds(paused, Date.parse('2026-08-05T12:10:00.000Z'))).toBe(90)
  })

  it('rejects inaccurate and implausibly fast GPS points', () => {
    const first = { latitude: -23.0, longitude: -43.0, accuracy: 5, timestamp: 1000 }
    expect(acceptGpsPoint(null, first).accepted).toBe(true)
    expect(acceptGpsPoint(first, { ...first, accuracy: 100, timestamp: 3000 }).reason).toBe('accuracy')
    const far = { latitude: -22.99, longitude: -43.0, accuracy: 5, timestamp: 2000 }
    expect(acceptGpsPoint(first, far).reason).toBe('speed')
  })

  it('calculates geographic distance without persisting coordinates', () => {
    const distance = calculateDistanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0.001 }
    )
    expect(distance).toBeGreaterThan(100)
    expect(distance).toBeLessThan(120)
  })
})
