import { parseLocalDate } from './date'

export function calculateRollingVolumeMetrics(sessions = [], now = new Date()) {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const currentStart = new Date(end)
  currentStart.setDate(currentStart.getDate() - 29)
  currentStart.setHours(0, 0, 0, 0)

  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - 30)

  let currentVolume = 0
  let previousVolume = 0

  sessions.forEach((session) => {
    const date = parseLocalDate(session.date)
    const volume = Number(session.total_volume || 0)
    if (!Number.isFinite(date.getTime()) || !Number.isFinite(volume)) return

    if (date >= currentStart && date <= end) currentVolume += volume
    else if (date >= previousStart && date < currentStart) previousVolume += volume
  })

  const changePercent = previousVolume > 0
    ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100)
    : null

  return { currentVolume, previousVolume, changePercent }
}
