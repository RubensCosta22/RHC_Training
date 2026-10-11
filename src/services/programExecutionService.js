import { equivalentExerciseIds, getExerciseAliases } from './exerciseAliasService'
import { supabase } from '../lib/supabaseClient'
import { evaluateDoubleProgression, evaluateLoadProgression, getProgramWeek } from '../domain/programEngine'

function repsLabel(min, max) {
  return Number(min) === Number(max) ? String(min) : `${min}-${max}`
}

function phaseReps(exercise, phase) {
  const usePhase = ['principal', 'secundario'].includes(exercise.exercise_role)
    && phase?.reps_min != null
    && phase?.reps_max != null
  return usePhase
    ? { min: Number(phase.reps_min), max: Number(phase.reps_max) }
    : { min: exercise.reps_min, max: exercise.reps_max }
}

function phaseSets(exercise, phase) {
  return Math.max(1, Math.round(Number(exercise.sets || 1) * Number(phase?.volume_modifier || 1)))
}

export async function getActiveProgramWorkout(profileId, sessionCode) {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('program_enrollments')
    .select('*')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle()
  if (enrollmentError) throw enrollmentError
  if (!enrollment) return null

  const { data: program, error: programError } = await supabase
    .from('training_programs')
    .select('*')
    .eq('id', enrollment.program_id)
    .single()
  if (programError) throw programError

  const currentWeek = getProgramWeek(enrollment.start_date)
  const programExpired = currentWeek > Number(program.duration_weeks || 52)
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
    .select('*')
    .eq('program_id', enrollment.program_id)
    .eq('code', sessionCode)
    .maybeSingle()
  if (sessionError) throw sessionError
  if (!session) return null

  const { data: rawExercises, error: exercisesError } = await supabase
    .from('program_exercises')
    .select('*')
    .eq('session_id', session.id)
    .order('sort_order')
  if (exercisesError) throw exercisesError

  const exerciseCatalogIds = [...new Set((rawExercises || []).map((item) => item.exercise_id).filter(Boolean))]
  const { data: catalogRows, error: catalogError } = exerciseCatalogIds.length
    ? await supabase.from('exercise_catalog').select('id,name,movement_pattern_id').in('id', exerciseCatalogIds)
    : { data: [], error: null }
  if (catalogError) throw catalogError

  const movementIds = [...new Set((catalogRows || []).map((item) => item.movement_pattern_id).filter(Boolean))]
  const { data: movementRows, error: movementError } = movementIds.length
    ? await supabase.from('movement_patterns').select('id,name,code').in('id', movementIds)
    : { data: [], error: null }
  if (movementError) throw movementError

  const exerciseIds = (rawExercises || []).map((exercise) => exercise.id)
  const { data: substitutions, error: substitutionsError } = exerciseIds.length
    ? await supabase.from('program_exercise_substitutions').select('program_exercise_id,alternative_exercise_id,sort_order').in('program_exercise_id', exerciseIds).order('sort_order')
    : { data: [], error: null }
  if (substitutionsError) throw substitutionsError

  const alternativeIds = [...new Set((substitutions || []).map((item) => item.alternative_exercise_id).filter(Boolean))]
  const { data: alternativeRows, error: alternativeError } = alternativeIds.length
    ? await supabase.from('exercise_catalog').select('id,name').in('id', alternativeIds)
    : { data: [], error: null }
  if (alternativeError) throw alternativeError

  const catalog = new Map((catalogRows || []).map((item) => [item.id, item]))
  const movements = new Map((movementRows || []).map((item) => [item.id, item]))
  const alternatives = new Map((alternativeRows || []).map((item) => [item.id, item.name]))
  const substitutionsByExercise = (substitutions || []).reduce((map, item) => {
    const current = map.get(item.program_exercise_id) || []
    current.push(item)
    map.set(item.program_exercise_id, current)
    return map
  }, new Map())

  const { data: baselines, error: baselineError } = await supabase.from('program_exercise_baselines').select('*').eq('enrollment_id', enrollment.id)
  if (baselineError) throw baselineError
  const baselineByExercise = new Map((baselines || []).map(item => [item.program_exercise_id, item]))
  const { data: exposures, error: exposuresError } = await supabase.from('program_exercise_exposures').select('*').eq('enrollment_id', enrollment.id).in('program_exercise_id', exerciseIds.length ? exerciseIds : ['00000000-0000-0000-0000-000000000000']).order('created_at', { ascending: false })
  if (exposuresError) throw exposuresError
  const latestByExercise = new Map()
  for (const exposure of exposures || []) {
    if (rawExercises.some(item => item.id === exposure.program_exercise_id && item.exercise_id === exposure.variation_exercise_id) && !latestByExercise.has(exposure.program_exercise_id)) latestByExercise.set(exposure.program_exercise_id, exposure)
  }
  const isDeload = /deload/i.test(phase?.name || '') || Number(phase?.volume_modifier ?? 1) < 0.7

  const exercises = (rawExercises || []).map((exercise) => {
    const prescribedReps = phaseReps(exercise, phase)
    const prescribedSets = phaseSets(exercise, phase)
    const catalogExercise = catalog.get(exercise.exercise_id)
    const latestExposure = latestByExercise.get(exercise.id)
    const latestLoad = latestExposure ? latestExposure.load : baselineByExercise.get(exercise.id)?.starting_load
    const movement = movements.get(catalogExercise?.movement_pattern_id)
    return {
      id: exercise.id,
      programId: enrollment.program_id,
      programExerciseId: exercise.id,
      programEnrollmentId: enrollment.id,
      exerciseId: exercise.exercise_id,
      name: catalogExercise?.name || 'Exercício',
      muscleGroup: movement?.code || movement?.name || null,
      movementPattern: movement?.code || movement?.name || null,
      role: exercise.exercise_role,
      sets: prescribedSets,
      reps: `${repsLabel(prescribedReps.min, prescribedReps.max)}${exercise.execution_mode === 'timed' ? ' s' : ''}${exercise.is_unilateral ? ' por lado' : ''}`,
      executionMode: exercise.execution_mode || 'external_load',
      isUnilateral: exercise.is_unilateral === true,
      latestExposure: latestExposure || null,
      recentExposures: (exposures || []).filter(item => item.program_exercise_id === exercise.id && item.variation_exercise_id === exercise.exercise_id).slice(0, 3),
      startingLoad: exercise.execution_mode === 'timed' ? 0 : latestLoad ?? null,
      baselineDate: baselineByExercise.get(exercise.id)?.source_workout_date ?? null,
      baselineSessionId: baselineByExercise.get(exercise.id)?.source_session_id ?? null,
      progressionPaused: isDeload || programExpired,
      executionNotes: exercise.execution_notes || null,
      repsMin: prescribedReps.min,
      repsMax: prescribedReps.max,
      targetRpeMin: exercise.target_rpe_min ?? phase?.target_rpe_min ?? null,
      targetRpeMax: exercise.target_rpe_max ?? phase?.target_rpe_max ?? null,
      rest: exercise.rest_seconds_min || 60,
      restMax: exercise.rest_seconds_max,
      progressionType: exercise.progression_type,
      loadIncrement: baselineByExercise.get(exercise.id)?.load_increment ?? exercise.default_load_increment,
      regressionPercent: exercise.regression_percent,
      failuresBeforeRegression: exercise.failures_before_regression,
      alternatives: (substitutionsByExercise.get(exercise.id) || []).map((item) => alternatives.get(item.alternative_exercise_id)).filter(Boolean)
    }
  })

  return {
    title: session.name,
    description: `${program.name || 'Programa'} • Semana ${currentWeek}${phase?.name ? ` • ${phase.name}` : ''}`,
    program,
    programExpired,
    enrollment: { ...enrollment, current_week: currentWeek },
    phase,
    session,
    exercises
  }
}

export async function getRecentProgramExposures(enrollmentId, programExerciseId, variationName, limit = 3) {
  const { data: variation, error: variationError } = await supabase.from('exercise_catalog').select('id').ilike('name', variationName).limit(1).maybeSingle()
  if (variationError) throw variationError
  if (!variation) return []
  const ids = equivalentExerciseIds(variation.id, await getExerciseAliases())
  const { data, error } = await supabase
    .from('program_exercise_exposures').select('*')
    .eq('enrollment_id', enrollmentId).eq('program_exercise_id', programExerciseId)
    .in('variation_exercise_id', ids)
    .order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data || []
}

export function calculateProgramSuggestion(exercise, value, previousFailures = 0) {
  const load = Number(value.weight || 0)
  if (exercise.progressionPaused) return { action: 'hold', suggestedLoad: load, reason: 'Progressão suspensa durante deload ou após o fim do ciclo.' }
  if (exercise.executionMode === 'timed') return { action: 'manual', suggestedLoad: null, reason: 'Registre segundos por série. Ao completar 40 s com controle, ajuste a dificuldade; sem aumento automático de carga.' }
  if (exercise.executionMode === 'bodyweight') return { action: 'manual', suggestedLoad: load, reason: 'Registre somente lastro extra (0 kg sem lastro). Progrida repetições; lastro é opcional, sem assistência.' }
  if (value.selectedName && value.selectedName !== exercise.name) return { action: 'manual', suggestedLoad: load, reason: 'Substituição com histórico próprio. Confirme carga, técnica e menor incremento do equipamento; não converter a carga do exercício principal.' }
  if (value.weight === '' || value.weight == null) return { action: 'hold', suggestedLoad: null, reason: 'Informe a carga efetivamente utilizada antes de gerar uma sugestão.' }
  const reps = Array.isArray(value.setReps) ? value.setReps : []
  const common = {
    currentLoad: Number(value.weight || 0), reps, targetSets: Number(exercise.sets || 0),
    completedSets: (value.completedSets || []).filter(Boolean).length,
    targetRpeMax: exercise.targetRpeMax,
    observedRpe: value.rpe === '' || value.rpe == null ? null : Number(value.rpe),
    loadIncrement: exercise.loadIncrement
  }
  if (exercise.progressionType === 'double_progression') return evaluateDoubleProgression({ ...common, repsMax: exercise.repsMax })
  if (exercise.progressionType === 'load') return evaluateLoadProgression({
    ...common,
    repsMin: exercise.repsMin,
    failedExposureCount: previousFailures,
    failuresBeforeRegression: exercise.failuresBeforeRegression,
    regressionPercent: exercise.regressionPercent
  })
  return { action: 'manual', suggestedLoad: Number(value.weight || 0), reason: 'Progressão manual configurada para este exercício.' }
}

export async function buildProgramExposurePayload({ profileId, exercise, value, suggestion: suppliedSuggestion = null }) {
  if (!exercise.programEnrollmentId || !exercise.programExerciseId || !exercise.programId) return null
  if (!value?.completed && !(Array.isArray(value?.completedSets) && value.completedSets.some(Boolean))) return null
  const variationName = value.selectedName || exercise.name
  let suggestion = suppliedSuggestion
  if (!suggestion) {
    const recent = await getRecentProgramExposures(
      exercise.programEnrollmentId,
      exercise.programExerciseId,
      variationName,
      3
    )
    const previousFailures = countFailedExposures(recent, exercise)
    suggestion = calculateProgramSuggestion(exercise, value, previousFailures)
  }

  const { data: variation, error: variationError } = await supabase
    .from('exercise_catalog')
    .select('id')
    .ilike('name', variationName)
    .limit(1)
    .maybeSingle()
  if (variationError) throw variationError
  if (!variation) throw new Error(`Exercício não encontrado no catálogo: ${variationName}`)

  return {
    profile_id: profileId,
    enrollment_id: exercise.programEnrollmentId,
    program_exercise_id: exercise.programExerciseId,
    program_id: exercise.programId,
    variation_exercise_id: variation.id,
    variation_name_snapshot: variationName,
    load: exercise.executionMode === 'timed' ? 0 : Number(value.weight || 0),
    reps: Array.isArray(value.setReps) ? value.setReps.map((item) => item === '' || item == null ? null : Number(item)) : [],
    completed_sets: (value.completedSets || []).filter(Boolean).length,
    observed_rpe: value.rpe === '' || value.rpe == null ? null : Number(value.rpe),
    progression_action: suggestion?.action || 'manual',
    suggested_load: suggestion?.suggestedLoad ?? Number(value.weight || 0),
    suggestion_reason: suggestion?.reason || null,
    accepted_action: value.progressionAccepted ?? null
  }
}

export async function buildProgramExposurePayloads({ profileId, exercises = [] }) {
  const relevant = exercises.filter((exercise) =>
    exercise.programEnrollmentId && exercise.programExerciseId && exercise.programId &&
    (exercise.completed || (Array.isArray(exercise.completedSets) && exercise.completedSets.some(Boolean)))
  )
  const payloads = await Promise.all(relevant.map((exercise) =>
    buildProgramExposurePayload({ profileId, exercise, value: exercise })
  ))
  return payloads.filter(Boolean)
}

export async function saveProgramExposure({ profileId, workoutSessionId, exercise, value, suggestion }) {
  const payload = await buildProgramExposurePayload({ profileId, exercise, value, suggestion })
  if (!payload) return null
  const { data, error } = await supabase
    .from('program_exercise_exposures')
    .insert({ ...payload, workout_session_id: workoutSessionId || null })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export function countFailedExposures(recent = [], exercise) {
  let failures = 0
  for (const item of recent) {
    const reps = item.reps || []
    if (Number(item.completed_sets) !== Number(exercise.sets) || reps.length !== Number(exercise.sets) || reps.some(v => v === '' || v == null) || item.observed_rpe == null) break
    if (item.progression_action === 'regress') break
    const missed = reps.some(v => Number(v) < Number(exercise.repsMin)) || Number(item.observed_rpe) > Number(exercise.targetRpeMax)
    if (!missed) break
    failures += 1
  }
  return failures
}
