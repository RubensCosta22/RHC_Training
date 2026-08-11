import { supabase } from '../lib/supabaseClient'
import { getWorkout, getWorkoutTypes } from '../data/workouts'
import { WORKOUT_TYPES, normalizeWorkoutTypes } from '../domain/workoutTypes'
import { sanitizeText } from '../utils/validation'
import { getActiveProgramWorkout } from './programExecutionService'

function normalizeExercise(exercise, index) {
  const name = sanitizeText(exercise.name, 120)
  if (!name) throw new Error(`Informe o nome do exercício ${index + 1}.`)
  return {
    id: exercise.id || crypto.randomUUID(),
    name,
    muscleGroup: sanitizeText(exercise.muscleGroup, 80) || 'Geral',
    sets: Math.max(1, Math.min(20, Number(exercise.sets) || 1)),
    reps: sanitizeText(exercise.reps, 40) || '8-12',
    rest: Math.max(0, Math.min(600, Number(exercise.rest) || 0)),
    goal: sanitizeText(exercise.goal, 160),
    alternatives: (exercise.alternatives || []).map((item) => sanitizeText(item, 120)).filter(Boolean).slice(0, 10),
    active: exercise.active !== false
  }
}

function isProgramFeatureUnavailable(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '').toLowerCase()
  return code === '42501' || code === '42P01' || message.includes('permission denied') || message.includes('does not exist')
}

async function readNormalizedPlan(profileId, type) {
  const { data: plan, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('profile_id', profileId)
    .eq('workout_code', type)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  if (!plan) return null

  const { data: rows, error: rowsError } = await supabase
    .from('workout_plan_exercises')
    .select('*')
    .eq('workout_plan_id', plan.id)
    .eq('is_active', true)
    .order('sort_order')
  if (rowsError) throw rowsError

  const catalogIds = [...new Set((rows || []).map((item) => item.exercise_id).filter(Boolean))]
  const { data: catalog, error: catalogError } = catalogIds.length
    ? await supabase.from('exercise_catalog').select('id,name,movement_pattern_id').in('id', catalogIds)
    : { data: [], error: null }
  if (catalogError) throw catalogError
  const catalogById = new Map((catalog || []).map((item) => [item.id, item]))

  const rowIds = (rows || []).map((item) => item.id)
  const { data: alternatives, error: alternativesError } = rowIds.length
    ? await supabase.from('workout_plan_exercise_alternatives').select('*').in('workout_plan_exercise_id', rowIds).order('sort_order')
    : { data: [], error: null }
  if (alternativesError) throw alternativesError
  const alternativeIds = [...new Set((alternatives || []).map((item) => item.alternative_exercise_id).filter(Boolean))]
  const { data: alternativeCatalog, error: alternativeCatalogError } = alternativeIds.length
    ? await supabase.from('exercise_catalog').select('id,name').in('id', alternativeIds)
    : { data: [], error: null }
  if (alternativeCatalogError) throw alternativeCatalogError
  const alternativeName = new Map((alternativeCatalog || []).map((item) => [item.id, item.name]))
  const alternativesByRow = (alternatives || []).reduce((map, item) => {
    const list = map.get(item.workout_plan_exercise_id) || []
    const name = alternativeName.get(item.alternative_exercise_id)
    if (name) list.push(name)
    map.set(item.workout_plan_exercise_id, list)
    return map
  }, new Map())

  return {
    id: plan.id,
    profile_id: plan.profile_id,
    workout_type: plan.workout_code,
    workout_code: plan.workout_code,
    title: plan.title,
    description: plan.description,
    active: plan.is_active,
    exercises: (rows || []).map((row) => ({
      id: row.id,
      name: catalogById.get(row.exercise_id)?.name || 'Exercício',
      muscleGroup: 'Geral',
      sets: row.prescribed_sets || 1,
      reps: row.prescribed_reps || '8-12',
      rest: row.rest_seconds || 60,
      goal: row.goal || '',
      alternatives: alternativesByRow.get(row.id) || [],
      active: row.is_active
    }))
  }
}

export async function getWorkoutPlan(profile, type) {
  try {
    const programWorkout = await getActiveProgramWorkout(profile.id, type)
    if (programWorkout) return programWorkout
  } catch (error) {
    if (!isProgramFeatureUnavailable(error)) throw error
  }

  const plan = await readNormalizedPlan(profile.id, type)
  if (plan) return { title: plan.title, description: plan.description, exercises: plan.exercises }
  return getWorkout(profile.name, type)
}

export async function getAvailablePlanOptions(profile) {
  let activeEnrollment = null
  const { data, error: enrollmentError } = await supabase
    .from('program_enrollments')
    .select('program_id')
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()
  if (enrollmentError && !isProgramFeatureUnavailable(enrollmentError)) throw enrollmentError
  if (!enrollmentError) activeEnrollment = data

  if (activeEnrollment) {
    const { data: sessions, error: sessionsError } = await supabase.from('program_sessions').select('code,name').eq('program_id', activeEnrollment.program_id).order('day_order')
    if (sessionsError && !isProgramFeatureUnavailable(sessionsError)) throw sessionsError
    if (!sessionsError) {
      const sessionByCode = new Map((sessions || []).map((item) => [item.code, item]))
      return normalizeWorkoutTypes((sessions || []).map((item) => item.code)).map((code) => ({
        code,
        title: sessionByCode.get(code)?.name || `Treino ${code}`
      }))
    }
  }

  const { data: plans, error } = await supabase.from('workout_plans').select('workout_code,title,description,is_active').eq('profile_id', profile.id).order('workout_code')
  if (error) throw error
  const types = new Set(getWorkoutTypes(profile.name))
  ;(plans || []).forEach((item) => item.is_active ? types.add(item.workout_code) : types.delete(item.workout_code))
  const planByCode = new Map((plans || []).map((item) => [item.workout_code, item]))
  return normalizeWorkoutTypes([...types]).map((code) => {
    const plan = planByCode.get(code)
    const fallback = getWorkout(profile.name, code)
    return {
      code,
      title: plan?.title || fallback?.title || `Treino ${code}`
    }
  })
}

export async function getAvailablePlanTypes(profile) {
  return (await getAvailablePlanOptions(profile)).map((item) => item.code)
}

export async function listPlansForAdmin(profile) {
  const results = await Promise.all(WORKOUT_TYPES.map(async (type) => {
    const current = await readNormalizedPlan(profile.id, type)
    const fallback = getWorkout(profile.name, type)
    return current || {
      profile_id: profile.id,
      workout_type: type,
      workout_code: type,
      title: fallback?.title || `Treino ${type}`,
      description: fallback?.description || '',
      exercises: fallback?.exercises || [normalizeExercise({ name: 'Novo exercício', muscleGroup: 'Geral', sets: 3, reps: '8-12', rest: 60 }, 0)],
      active: Boolean(fallback),
      fallback: true
    }
  }))
  return results
}

// Admin plan editing will be re-enabled through a V2 RPC so catalog identities and
// normalized child rows are updated atomically. Do not write free-text JSON into V2.
export async function savePlan() {
  throw new Error('Edição de planos está temporariamente bloqueada durante a migração V2.')
}
