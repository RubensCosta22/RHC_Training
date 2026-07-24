import { parseLocalDate, toLocalDateKey } from '../utils/date'

function startOfDay(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function getWeekKey(date) {
  const current = parseLocalDate(date)
  const start = new Date(current)
  start.setDate(current.getDate() - current.getDay())
  return toLocalDateKey(start)
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length
}

export function buildAdminStatsSnapshot(entries, periodDays = 30, now = new Date()) {
  const safeEntries = Array.isArray(entries) ? entries : []
  const cutoff = periodDays === 'all'
    ? null
    : startOfDay(new Date(now.getTime() - (Number(periodDays) - 1) * 86400000))

  const profiles = safeEntries.map(({ profile, stats }) => {
    const allSessions = stats?.raw?.sessions || []
    const sessions = cutoff
      ? allSessions.filter((session) => parseLocalDate(session.date) >= cutoff)
      : allSessions
    const totalVolume = sessions.reduce((sum, session) => sum + Number(session.total_volume || 0), 0)
    const averageDuration = Math.round(average(sessions.map((session) => session.duration_minutes)))
    const lastSession = [...sessions].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null

    return {
      id: profile.id,
      name: profile.name,
      goal: profile.goal,
      avatarSignedUrl: profile.avatarSignedUrl || null,
      workouts: sessions.length,
      volume: totalVolume,
      averageDuration,
      lastSession,
      sessions
    }
  })

  const allSessions = profiles.flatMap((profile) => profile.sessions.map((session) => ({
    ...session,
    profileId: profile.id,
    profileName: profile.name
  })))

  const totalWorkouts = allSessions.length
  const totalVolume = allSessions.reduce((sum, session) => sum + Number(session.total_volume || 0), 0)
  const averageDuration = Math.round(average(allSessions.map((session) => session.duration_minutes)))
  const activeProfiles = profiles.filter((profile) => profile.workouts > 0).length

  const weeklyTrendMap = allSessions.reduce((acc, session) => {
    const week = getWeekKey(session.date)
    acc[week] = acc[week] || { week, workouts: 0, volume: 0 }
    acc[week].workouts += 1
    acc[week].volume += Number(session.total_volume || 0)
    return acc
  }, {})

  const recentActivity = [...allSessions]
    .sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date))
      return byDate || String(b.created_at || '').localeCompare(String(a.created_at || ''))
    })
    .slice(0, 12)

  const comparison = [...profiles]
    .sort((a, b) => b.workouts - a.workouts || b.volume - a.volume)
    .map(({ sessions, ...profile }) => profile)

  return {
    periodDays,
    summary: {
      profiles: profiles.length,
      activeProfiles,
      inactiveProfiles: Math.max(0, profiles.length - activeProfiles),
      totalWorkouts,
      totalVolume,
      averageDuration
    },
    comparison,
    weeklyTrend: Object.values(weeklyTrendMap).sort((a, b) => a.week.localeCompare(b.week)),
    recentActivity
  }
}
