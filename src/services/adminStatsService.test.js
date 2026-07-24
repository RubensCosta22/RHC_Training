import { describe, expect, it } from 'vitest'
import { buildAdminStatsSnapshot } from './adminStatsSnapshot'

const now = new Date('2026-07-24T12:00:00')

const entries = [
  {
    profile: { id: 'p1', name: 'Henrique', goal: 'Forca' },
    stats: { raw: { sessions: [
      { date: '2026-07-24', total_volume: 1000, duration_minutes: 60, workout_type: 'A' },
      { date: '2026-07-10', total_volume: 800, duration_minutes: 50, workout_type: 'B' }
    ] } }
  },
  {
    profile: { id: 'p2', name: 'Nicole', goal: 'Hipertrofia' },
    stats: { raw: { sessions: [
      { date: '2026-07-23', total_volume: 600, duration_minutes: 40, workout_type: 'C' }
    ] } }
  }
]

describe('buildAdminStatsSnapshot', () => {
  it('agrega perfis e sessoes no periodo', () => {
    const result = buildAdminStatsSnapshot(entries, 7, now)
    expect(result.summary.profiles).toBe(2)
    expect(result.summary.activeProfiles).toBe(2)
    expect(result.summary.totalWorkouts).toBe(2)
    expect(result.summary.totalVolume).toBe(1600)
    expect(result.summary.averageDuration).toBe(50)
    expect(result.comparison[0].name).toBe('Henrique')
  })

  it('preserva historico completo quando periodo e all', () => {
    const result = buildAdminStatsSnapshot(entries, 'all', now)
    expect(result.summary.totalWorkouts).toBe(3)
    expect(result.summary.totalVolume).toBe(2400)
  })
})
