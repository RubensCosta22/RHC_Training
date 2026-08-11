import { describe, expect, it } from 'vitest'
import { calculateRollingVolumeMetrics } from './rollingMetrics'

describe('rolling volume metrics', () => {
  it('compara os últimos 30 dias com os 30 dias anteriores', () => {
    const sessions = [
      { date: '2026-08-10', total_volume: 600 },
      { date: '2026-07-13', total_volume: 500 },
      { date: '2026-07-12', total_volume: 800 },
      { date: '2026-06-12', total_volume: 2000 }
    ]

    expect(calculateRollingVolumeMetrics(sessions, new Date(2026, 7, 11))).toEqual({
      currentVolume: 1100,
      previousVolume: 800,
      changePercent: 38
    })
  })

  it('não inventa percentual quando não há base anterior', () => {
    expect(calculateRollingVolumeMetrics([
      { date: '2026-08-10', total_volume: 600 }
    ], new Date(2026, 7, 11))).toEqual({
      currentVolume: 600,
      previousVolume: 0,
      changePercent: null
    })
  })
})
