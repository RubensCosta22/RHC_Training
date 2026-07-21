import { supabase } from '../lib/supabaseClient'
import { evaluateDoubleProgression, evaluateLoadProgression, getProgramWeek } from '../domain/programEngine'

function repsLabel(min, max) {
  return Number(min) === Number(max) ? String(min) : `${min}-${max}`
}

function phaseReps(exercise, phase) {
  const usePhase = ['principal', 'secundario'].includes(exercise.exercise_role)
    && phase?.reps_min != null
    && phase?.reps_max != null

  if (!usePhase) {
    return { min: exercise.reps_min, max: exercise.reps_max }
  }

  return {
    min: Number(phase.reps_min),
    max: Number(phase.reps_max)
  }
}

function phaseSets(exercise, phase) {
  const baseSets = Number(exercise.sets || 1)
  const modifier = Number(phase?.volume_modifier || 1)
  return Math.max(1, Math.round(baseSets * modifier))
}

export async function getActiveProgramWorkout(profileId, sessionCode) {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('profile_program_enrollments')
    .select('*, training_programs(*)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle()

  if (enrollmentError) throw enrollmentError
  if (!enrollment) return null

  const currentWeek = Math.min(
    Number(enrollment.training_programs?.duration_weeks || 52),
    getProgramWeek(enrollment.start_date)
  )

  const { data: phase, error: phaseError } = await supabase
    .from('program_phases')
    .select('*')
    .eq('program_id', enrollment.program_id)
    .lte('week_start', currentWeek)
    .gte('week_end', currentWeek)
    .order('sort_order')
    .limit(1)
    .maybeSingle()

  if (phaseError) throw phaseError

  const { data: session, error: sessionError } = await supabase
    .from('program_sessions')
    .select('*, program_exercises(*)')
    .eq('program_id', enrollment.program_id)
    .eq('code', sessionCode)
    .maybeSingle()

  if (sessionError) throw sessionError
  if (!session) return null

  const rawExercises = session.program_exercises || []
  const exerciseIds = rawExercises.map((exercise) => exercise.id).filter(Boolean)
  let substitutionsByExercise = new Map()

  if (exerciseIds.length) {
    const { data: substitutions, error: substitutionsError } = await supabase
      .from('program_exercise_substitutions')
      .select('program_exercise_id, exercise_name, sort_order')
      .in('program_exercise_id', exerciseIds)
      .order('sort_order')

    if (substitutionsError) throw substitutionsError

    substitutionsByExercise = (substitutions || []).reduce((map, item) => {
      const current = map.get(item.program_exercise_id) || []
      current.push(item)
      map.set(item.program_exercise_id, current)
      return map
    }, new Map())
  }

  const exercises = rawExercises
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((exercise) => {
      const prescribedReps = phaseReps(exercise, phase)
      const prescribedSets = phaseSets(exercise, phase)

      return {
        id: exercise.id,
        programExerciseId: exercise.id,
        programEnrollmentId: enrollment.id,
        name: exercise.exercise_name,
        muscleGroup: exercise.movement_pattern,
        movementPattern: exercise.movement_pattern,
        role: exercise.exercise_role,
        sets: prescribedSets,
        reps: repsLabel(prescribedReps.min, prescribedReps.max),
        repsMin: prescribedReps.min,
        repsMax: prescribedReps.max,
        targetRpeMin: exercise.target_rpe_min ?? phase?.target_rpe_min ?? null,
        targetRpeMax: exercise.target_rpe_max ?? phase?.target_rpe_max ?? null,
        rest: exercise.rest_seconds_min || 60,
        restMax: exercise.rest_seconds_max,
        progressionType: exercise.progression_type,
        loadIncrement: exercise.default_load_increment,
        regressionPercent: exercise.regression_percent,
        failuresBeforeRegression: exercise.failures_before_regression,
        alternatives: (substitutionsByExercise.get(exercise.id) || [])
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
          .map((item) => item.exercise_name)
      }
    })

  return {
    title: session.name,
    description: `${enrollment.training_programs?.name || 'Programa'} • Semana ${currentWeek}${phase?.name ? ` • ${phase.name}` : ''}`,
    program: enrollment.training_programs,
    enrollment: { ...enrollment, current_week: currentWeek },
    phase,
    session,
    exercises
  }
}

export async function getRecentProgramExposures(enrollmentId, programExerciseId, variationName, limit = 3) {
  const { data, error } = await supabase
    .from('program_exercise_exposures')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .eq('program_exercise_id', programExerciseId)
    .eq('variation_name', variationName)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export function calculateProgramSuggestion(exercise, value, previousFailures = 0) {
  const reps = Array.isArray(value.setReps) ? value.setReps.map(Number) : []
  const common = {
    currentLoad: Number(value.weight || 0),
    reps,
    targetSets: Number(exercise.sets || 0),
    targetRpeMax: exercise.targetRpeMax,
    observedRpe: value.rpe === '' || value.rpe == null ? null : Number(value.rpe),
    loadIncrement: exercise.loadIncrement
  }

  if (exercise.progressionType === 'double_progression') {
    return evaluateDoubleProgression({
      ...common,
      repsMax: exercise.repsMax
    })
  }

  if (exercise.progressionType === 'load') {
    return evaluateLoadProgression({
      ...common,
      completedSets: (value.completedSets || []).filter(Boolean).length,
      repsMin: exercise.repsMin,
      failedExposureCount: previousFailures,
      failuresBeforeRegression: exercise.failuresBeforeRegression,
      regressionPercent: exercise.regressionPercent
    })
  }

  return {
    action: 'manual',
    suggestedLoad: Number(value.weight || 0),
    reason: 'Progressao manual configurada para este exercicio.'
  }
}

export async function saveProgramExposure({
  profileId,
  workoutSessionId,
  exercise,
  value,
  suggestion
}) {
  if (!exercise.programEnrollmentId || !exercise.programExerciseId) return null

  const payload = {
    profile_id: profileId,
    enrollment_id: exercise.programEnrollmentId,
    program_exercise_id: exercise.programExerciseId,
    workout_session_id: workoutSessionId || null,
    variation_name: value.selectedName || exercise.name,
    load: Number(value.weight || 0),
    reps: Array.isArray(value.setReps) ? value.setReps.map((item) => Number(item || 0)) : [],
    completed_sets: (value.completedSets || []).filter(Boolean).length,
    observed_rpe: value.rpe === '' || value.rpe == null ? null : Number(value.rpe),
    progression_action: suggestion?.action || 'manual',
    suggested_load: suggestion?.suggestedLoad ?? Number(value.weight || 0),
    suggestion_reason: suggestion?.reason || null,
    accepted_action: value.progressionAccepted ?? null
  }

  const { data, error } = await supabase
    .from('program_exercise_exposures')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data
}
