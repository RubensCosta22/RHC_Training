import { supabase } from '../lib/supabaseClient'

function average(values = []) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length
}

function dateParts(value) {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number)
  return { year, month, day }
}

function diffDays(fromDate, toDate = new Date()) {
  const from = dateParts(fromDate)
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day)
  const toUtc = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
  return Math.max(0, Math.floor((toUtc - fromUtc) / 86400000))
}

export async function getProgramStats(profileId) {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('program_enrollments')
    .select('*, training_programs(*)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .is('archived_at', null)
    .maybeSingle()

  if (enrollmentError) throw enrollmentError
  if (!enrollment) return null

  const durationWeeks = Number(enrollment.training_programs?.duration_weeks || 12)
  const elapsedDays = diffDays(enrollment.start_date)
  const week = Math.max(1, Math.min(durationWeeks, Math.floor(elapsedDays / 7) + 1))
  const dayInWeek = (elapsedDays % 7) + 1

  const [{ data: phase, error: phaseError }, { data: programSessions, error: sessionsError }] = await Promise.all([
    supabase
      .from('program_phases')
      .select('*')
      .eq('program_id', enrollment.program_id)
      .lte('week_start', week)
      .gte('week_end', week)
      .order('sort_order')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('program_sessions')
      .select('code,session_type,day_order,is_optional')
      .eq('program_id', enrollment.program_id)
      .order('day_order')
  ])

  if (phaseError) throw phaseError
  if (sessionsError) throw sessionsError

  const requiredSessions = (programSessions || []).filter((item) => item.is_optional !== true)
  const requiredCodes = requiredSessions.map((item) => item.code)
  const strengthSessions = requiredSessions.filter((item) => item.session_type === 'strength')

  let completedProgramSessions = []
  if (requiredCodes.length) {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id,workout_code,workout_date')
      .eq('profile_id', profileId)
      .is('archived_at', null)
      .gte('workout_date', enrollment.start_date)
      .in('workout_code', requiredCodes)
      .order('workout_date', { ascending: true })
    if (error) throw error
    completedProgramSessions = data || []
  }

  const completedWeeks = Math.max(0, week - 1)
  const expectedThisWeek = requiredSessions.filter((item) => Number(item.day_order || 0) <= dayInWeek).length
  const expectedSessions = (completedWeeks * requiredSessions.length) + expectedThisWeek
  const completedSessions = completedProgramSessions.length
  const adherence = expectedSessions > 0
    ? Math.min(100, Math.round((completedSessions / expectedSessions) * 100))
    : 0

  const strengthCodes = new Set(strengthSessions.map((item) => item.code))
  const completedStrengthSessions = completedProgramSessions.filter((item) => strengthCodes.has(item.workout_code)).length
  const expectedStrengthThisWeek = strengthSessions.filter((item) => Number(item.day_order || 0) <= dayInWeek).length
  const expectedStrengthSessions = (completedWeeks * strengthSessions.length) + expectedStrengthThisWeek

  const { data: exposures, error: exposureError } = await supabase
    .from('program_exercise_exposures')
    .select('*')
    .eq('profile_id', profileId)
    .eq('enrollment_id', enrollment.id)
    .order('created_at', { ascending: true })

  if (exposureError) throw exposureError

  const normalized = exposures || []
  const rpeValues = normalized.map((item) => item.observed_rpe).filter((value) => value != null)
  const accepted = normalized.filter((item) => item.accepted_action === true).length
  const increases = normalized.filter((item) => item.progression_action === 'increase').length
  const regressions = normalized.filter((item) => item.progression_action === 'regress').length
  const holds = normalized.filter((item) => item.progression_action === 'hold').length

  const variations = {}
  normalized.forEach((item) => {
    const key = item.variation_name_snapshot || 'Exercício'
    variations[key] = variations[key] || {
      name: key,
      firstLoad: null,
      lastLoad: 0,
      maxLoad: 0,
      exposures: 0,
      averageRpe: 0,
      rpes: []
    }

    const entry = variations[key]
    const load = Number(item.load || 0)
    if (load > 0 && entry.firstLoad == null) entry.firstLoad = load
    if (load > 0) entry.lastLoad = load
    entry.maxLoad = Math.max(entry.maxLoad, load)
    entry.exposures += 1
    if (item.observed_rpe != null) entry.rpes.push(Number(item.observed_rpe))
  })

  const progression = Object.values(variations)
    .map((item) => ({
      ...item,
      averageRpe: Number(average(item.rpes).toFixed(1)),
      progressPercent: item.firstLoad > 0
        ? Math.round(((item.lastLoad - item.firstLoad) / item.firstLoad) * 100)
        : 0
    }))
    .sort((a, b) => b.exposures - a.exposures)

  return {
    enrollment: { ...enrollment, current_week: week },
    program: enrollment.training_programs,
    phase,
    week,
    durationWeeks,
    baseline: enrollment.running_baseline || {},
    summary: {
      exposures: normalized.length,
      completedSessions,
      expectedSessions,
      completedStrengthSessions,
      expectedStrengthSessions,
      adherence,
      averageRpe: Number(average(rpeValues).toFixed(1)),
      accepted,
      increases,
      holds,
      regressions
    },
    progression
  }
}
