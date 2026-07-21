import { supabase } from '../lib/supabaseClient'
import { getProgramWeek } from '../domain/programEngine'

function average(values = []) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length
}

export async function getProgramStats(profileId) {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('profile_program_enrollments')
    .select('*, training_programs(*)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle()

  if (enrollmentError) throw enrollmentError
  if (!enrollment) return null

  const week = Math.min(
    Number(enrollment.training_programs?.duration_weeks || 52),
    getProgramWeek(enrollment.start_date)
  )

  const { data: phase, error: phaseError } = await supabase
    .from('program_phases')
    .select('*')
    .eq('program_id', enrollment.program_id)
    .lte('week_start', week)
    .gte('week_end', week)
    .order('sort_order')
    .limit(1)
    .maybeSingle()

  if (phaseError) throw phaseError

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
    const key = item.variation_name
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

  const expectedStrengthSessions = Math.min(week, 12) * 4
  const sessionIds = new Set(normalized.map((item) => item.workout_session_id).filter(Boolean))
  const completedStrengthSessions = sessionIds.size
  const adherence = expectedStrengthSessions > 0
    ? Math.min(100, Math.round((completedStrengthSessions / expectedStrengthSessions) * 100))
    : 0

  return {
    enrollment,
    program: enrollment.training_programs,
    phase,
    week,
    durationWeeks: Number(enrollment.training_programs?.duration_weeks || 12),
    baseline: enrollment.running_baseline || {},
    summary: {
      exposures: normalized.length,
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
