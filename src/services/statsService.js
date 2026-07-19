import { getProgressData } from './workoutService'
import { parseLocalDate, toLocalDateKey } from '../utils/date'

function getWeekKey(date) {
  const current = parseLocalDate(date)
  const start = new Date(current)
  start.setDate(current.getDate() - current.getDay())
  return toLocalDateKey(start)
}

function getDayName(date) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(parseLocalDate(date))
}

function average(numbers) {
  if (!numbers.length) return 0
  return numbers.reduce((acc, value) => acc + Number(value || 0), 0) / numbers.length
}

export async function getStatsCenter(profileId) {
  const data = await getProgressData(profileId)

  const sessions = data.sessions || []
  const exercises = data.exercises || []
  const measurements = data.measurements || []

  const totalWorkouts = sessions.length
  const totalVolume = sessions.reduce((acc, item) => acc + Number(item.total_volume || 0), 0)
  const averageDuration = Math.round(average(sessions.map((item) => item.duration_minutes)))
  const biggestWorkout = sessions.reduce((best, item) => {
    return Number(item.total_volume || 0) > Number(best?.total_volume || 0) ? item : best
  }, null)

  const now = new Date()
  const weekKey = getWeekKey(now)
  const monthKey = toLocalDateKey(now).slice(0, 7)

  const weeklyVolume = sessions
    .filter((item) => getWeekKey(item.date) === weekKey)
    .reduce((acc, item) => acc + Number(item.total_volume || 0), 0)

  const monthlyVolume = sessions
    .filter((item) => item.date?.slice(0, 7) === monthKey)
    .reduce((acc, item) => acc + Number(item.total_volume || 0), 0)

  const byExercise = {}
  exercises.forEach((item) => {
    const name = item.exercise_name
    byExercise[name] = byExercise[name] || {
      exerciseName: name,
      total: 0,
      maxWeight: 0,
      totalVolume: 0,
      firstWeight: null,
      lastWeight: 0,
      lastDate: null,
      recordDate: null
    }

    byExercise[name].total += 1
    const weight = Number(item.weight || 0)
    if (weight > 0 && byExercise[name].firstWeight === null) byExercise[name].firstWeight = weight
    if (weight > 0) { byExercise[name].lastWeight = weight; byExercise[name].lastDate = item.date }
    if (weight > byExercise[name].maxWeight) { byExercise[name].maxWeight = weight; byExercise[name].recordDate = item.date }
    byExercise[name].totalVolume += Number(item.volume || 0)
  })

  Object.values(byExercise).forEach((item) => {
    item.progress = item.firstWeight > 0
      ? Math.round(((item.lastWeight - item.firstWeight) / item.firstWeight) * 100)
      : 0
  })

  const exerciseRanking = Object.values(byExercise).sort((a, b) => b.total - a.total)
  const mostTrainedExercise = exerciseRanking[0] || null
  const personalRecords = Object.values(byExercise)
    .filter((item) => item.maxWeight > 0)
    .sort((a, b) => b.maxWeight - a.maxWeight)

  const weekdayMap = {}
  sessions.forEach((item) => {
    const day = getDayName(item.date)
    weekdayMap[day] = (weekdayMap[day] || 0) + 1
  })

  const weekdayFrequency = Object.entries(weekdayMap).map(([day, total]) => ({
    day,
    total
  }))

  const weeklyVolumeChart = Object.values(
    sessions.reduce((acc, item) => {
      const key = getWeekKey(item.date)
      acc[key] = acc[key] || { week: key, volume: 0, workouts: 0 }
      acc[key].volume += Number(item.total_volume || 0)
      acc[key].workouts += 1
      return acc
    }, {})
  )

  const monthlyVolumeChart = Object.values(
    sessions.reduce((acc, item) => {
      const key = item.date?.slice(0, 7)
      acc[key] = acc[key] || { month: key, volume: 0, workouts: 0 }
      acc[key].volume += Number(item.total_volume || 0)
      acc[key].workouts += 1
      return acc
    }, {})
  )

  return {
    raw: data,
    summary: {
      totalWorkouts,
      totalVolume,
      weeklyVolume,
      monthlyVolume,
      averageDuration,
      biggestWorkout,
      mostTrainedExercise
    },
    charts: {
      weeklyVolumeChart,
      monthlyVolumeChart,
      weekdayFrequency
    },
    rankings: {
      exerciseRanking,
      personalRecords
    },
    measurements
  }
}
