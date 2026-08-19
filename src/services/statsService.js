import { getProgressData } from './workoutService'
import { parseLocalDate, toLocalDateKey } from '../utils/date'

const EXERCISE_NAME_ALIASES = new Map([
  ['leg press', 'Leg Press'],
  ['abdomen', 'Abdominal máquina'],
  ['abdominal maquina', 'Abdominal máquina'],
  ['extensora', 'Cadeira extensora'],
  ['cadeira extensora', 'Cadeira extensora'],
  ['hip thrust', 'Elevação pélvica'],
  ['hack machine', 'Hack Machine'],
  ['face pull', 'Puxada para o rosto (Face Pull)'],
  ['farmer walk', 'Caminhada do fazendeiro'],
  ['kettlebell swing', 'Balanço com kettlebell'],
  ['pallof press', 'Press anti-rotação (Pallof Press)'],
  ['reverse fly maquina', 'Crucifixo inverso na máquina'],
  ['smith machine', 'Máquina Smith'],
  ['step-up no banco', 'Subida no banco'],
  ['tibial raise', 'Elevação tibial']
])

function exerciseNameKey(name) {
  return String(name || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function canonicalExerciseName(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return 'Exercício'
  return EXERCISE_NAME_ALIASES.get(exerciseNameKey(trimmed)) || trimmed
}

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

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function percentageChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getTrainingStreak(sessions) {
  const weeks = [...new Set(sessions.map((item) => getWeekKey(item.date)))].sort()
  let best = 0
  let run = 0
  let previous = null
  weeks.forEach((week) => {
    const current = parseLocalDate(week)
    const consecutive = previous && Math.round((current - previous) / 86400000) === 7
    run = consecutive ? run + 1 : 1
    best = Math.max(best, run)
    previous = current
  })
  let current = 0
  const thisWeek = parseLocalDate(getWeekKey(new Date()))
  const latestWeek = weeks.length ? parseLocalDate(weeks[weeks.length - 1]) : null
  const latestDistance = latestWeek ? Math.round((thisWeek - latestWeek) / 86400000) : null
  const referenceWeek = latestDistance === 0 || latestDistance === 7 ? latestWeek : null
  for (let index = weeks.length - 1; index >= 0; index -= 1) {
    const week = parseLocalDate(weeks[index])
    const expected = referenceWeek && addDays(referenceWeek, -7 * current)
    if (expected && Math.round((expected - week) / 86400000) === 0) current += 1
    else break
  }
  return { current, best }
}

export async function getStatsCenter(profileId) {
  const data = await getProgressData(profileId)
  const sessions = data.sessions || []
  const exercises = (data.exercises || []).map((item) => ({ ...item, exercise_name: canonicalExerciseName(item.exercise_name) }))
  const measurements = data.measurements || []
  const totalWorkouts = sessions.length
  const totalVolume = sessions.reduce((acc, item) => acc + Number(item.total_volume || 0), 0)
  const averageDuration = Math.round(average(sessions.map((item) => item.duration_minutes)))
  const biggestWorkout = sessions.reduce((best, item) => Number(item.total_volume || 0) > Number(best?.total_volume || 0) ? item : best, null)
  const now = new Date()
  const weekKey = getWeekKey(now)
  const previousWeekKey = getWeekKey(addDays(now, -7))
  const monthKey = toLocalDateKey(now).slice(0, 7)
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthKey = toLocalDateKey(previousMonthDate).slice(0, 7)
  const weeklyVolume = sessions.filter((item) => getWeekKey(item.date) === weekKey).reduce((acc, item) => acc + Number(item.total_volume || 0), 0)
  const monthlyVolume = sessions.filter((item) => item.date?.slice(0, 7) === monthKey).reduce((acc, item) => acc + Number(item.total_volume || 0), 0)
  const previousWeeklyVolume = sessions.filter((item) => getWeekKey(item.date) === previousWeekKey).reduce((acc, item) => acc + Number(item.total_volume || 0), 0)
  const previousMonthlyVolume = sessions.filter((item) => item.date?.slice(0, 7) === previousMonthKey).reduce((acc, item) => acc + Number(item.total_volume || 0), 0)
  const weeklyWorkouts = sessions.filter((item) => getWeekKey(item.date) === weekKey).length
  const previousWeeklyWorkouts = sessions.filter((item) => getWeekKey(item.date) === previousWeekKey).length
  const streak = getTrainingStreak(sessions)
  const byExercise = {}
  exercises.forEach((item) => {
    const name = item.exercise_name
    byExercise[name] = byExercise[name] || { exerciseName: name, total: 0, maxWeight: 0, totalVolume: 0, firstWeight: null, lastWeight: 0, lastDate: null, recordDate: null }
    byExercise[name].total += 1
    const weight = Number(item.weight || 0)
    if (weight > 0 && byExercise[name].firstWeight === null) byExercise[name].firstWeight = weight
    if (weight > 0) { byExercise[name].lastWeight = weight; byExercise[name].lastDate = item.date }
    if (weight > byExercise[name].maxWeight) { byExercise[name].maxWeight = weight; byExercise[name].recordDate = item.date }
    byExercise[name].totalVolume += Number(item.volume || 0)
  })
  Object.values(byExercise).forEach((item) => { item.progress = item.firstWeight > 0 ? Math.round(((item.lastWeight - item.firstWeight) / item.firstWeight) * 100) : 0 })
  const exerciseRanking = Object.values(byExercise).sort((a, b) => b.total - a.total)
  const mostTrainedExercise = exerciseRanking[0] || null
  const personalRecords = Object.values(byExercise).filter((item) => item.maxWeight > 0).sort((a, b) => b.maxWeight - a.maxWeight)
  const weekdayMap = {}
  sessions.forEach((item) => { const day = getDayName(item.date); weekdayMap[day] = (weekdayMap[day] || 0) + 1 })
  const weekdayFrequency = Object.entries(weekdayMap).map(([day, total]) => ({ day, total }))
  const weeklyVolumeChart = Object.values(sessions.reduce((acc, item) => { const key = getWeekKey(item.date); acc[key] = acc[key] || { week: key, volume: 0, workouts: 0 }; acc[key].volume += Number(item.total_volume || 0); acc[key].workouts += 1; return acc }, {}))
  const monthlyVolumeChart = Object.values(sessions.reduce((acc, item) => { const key = item.date?.slice(0, 7); acc[key] = acc[key] || { month: key, volume: 0, workouts: 0 }; acc[key].volume += Number(item.total_volume || 0); acc[key].workouts += 1; return acc }, {}))
  const milestones = [1, 10, 25, 50, 100, 250]
  const workoutMilestone = [...milestones].reverse().find((value) => totalWorkouts >= value) || 0
  const nextWorkoutMilestone = milestones.find((value) => totalWorkouts < value) || Math.ceil((totalWorkouts + 1) / 100) * 100
  const volumeMilestones = [1000, 5000, 10000, 25000, 50000, 100000, 250000]
  const volumeMilestone = [...volumeMilestones].reverse().find((value) => totalVolume >= value) || 0
  const nextVolumeMilestone = volumeMilestones.find((value) => totalVolume < value) || Math.ceil((totalVolume + 1) / 100000) * 100000
  const achievements = [
    { id: 'first', title: 'Primeiro passo', description: 'Primeiro treino concluído', unlocked: totalWorkouts >= 1, value: '1' },
    { id: 'workouts', title: `${workoutMilestone || nextWorkoutMilestone} treinos`, description: workoutMilestone ? 'Marco de consistência' : `Faltam ${nextWorkoutMilestone - totalWorkouts}`, unlocked: Boolean(workoutMilestone), value: workoutMilestone || nextWorkoutMilestone },
    { id: 'volume', title: volumeMilestone ? `${Math.round(volumeMilestone / 1000)} mil kg` : `${Math.round(nextVolumeMilestone / 1000)} mil kg`, description: volumeMilestone ? 'Volume acumulado' : 'Próximo marco de volume', unlocked: Boolean(volumeMilestone), value: volumeMilestone || nextVolumeMilestone },
    { id: 'streak', title: `${streak.best} semanas`, description: 'Melhor sequência registrada', unlocked: streak.best >= 2, value: streak.best },
    { id: 'records', title: `${personalRecords.length} recordes`, description: 'Exercícios com carga máxima', unlocked: personalRecords.length >= 3, value: personalRecords.length }
  ]
  return {
    raw: { ...data, exercises },
    summary: { totalWorkouts, totalVolume, weeklyVolume, monthlyVolume, weeklyWorkouts, averageDuration, biggestWorkout, mostTrainedExercise, streak, comparisons: { weeklyVolume: percentageChange(weeklyVolume, previousWeeklyVolume), monthlyVolume: percentageChange(monthlyVolume, previousMonthlyVolume), weeklyWorkouts: percentageChange(weeklyWorkouts, previousWeeklyWorkouts) } },
    charts: { weeklyVolumeChart, monthlyVolumeChart, weekdayFrequency },
    rankings: { exerciseRanking, personalRecords },
    achievements,
    measurements
  }
}
