import { supabase } from '../lib/supabaseClient'
import { getWorkout, getWorkoutTypes } from '../data/workouts'
import { WORKOUT_TYPES, normalizeWorkoutTypes } from '../domain/workoutTypes'
import { sanitizeText } from '../utils/validation'
import { getActiveProgramWorkout } from './programExecutionService'

function normalizeExercise(exercise, index) {
  const name = sanitizeText(exercise.name, 120)
  if (!name) throw new Error(`Informe o nome do exercicio ${index + 1}.`)
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

export async function getWorkoutPlan(profile, type) {
  try {
    const programWorkout = await getActiveProgramWorkout(profile.id, type)
    if (programWorkout) return programWorkout
  } catch (error) {
    if (!isProgramFeatureUnavailable(error)) throw error
  }

  const { data, error } = await supabase.from('workout_plans').select('*').eq('profile_id', profile.id).eq('workout_type', type).maybeSingle()
  if (error) throw error
  if (data && !data.active) return null
  if (!data) return getWorkout(profile.name, type)
  return { title: data.title, description: data.description, exercises: (data.exercises || []).filter((item) => item.active !== false) }
}

export async function getAvailablePlanTypes(profile) {
  let activeEnrollment = null
  const { data, error: enrollmentError } = await supabase.from('profile_program_enrollments').select('program_id').eq('profile_id', profile.id).eq('status', 'active').maybeSingle()
  if (enrollmentError && !isProgramFeatureUnavailable(enrollmentError)) throw enrollmentError
  if (!enrollmentError) activeEnrollment = data

  if (activeEnrollment) {
    const { data: sessions, error: sessionsError } = await supabase.from('program_sessions').select('code').eq('program_id', activeEnrollment.program_id).order('day_order')
    if (sessionsError && !isProgramFeatureUnavailable(sessionsError)) throw sessionsError
    if (!sessionsError) return normalizeWorkoutTypes((sessions || []).map((item) => item.code))
  }

  const { data: plans, error } = await supabase.from('workout_plans').select('workout_type,active').eq('profile_id', profile.id).order('workout_type')
  if (error) throw error
  const types = new Set(getWorkoutTypes(profile.name))
  ;(plans || []).forEach((item) => item.active ? types.add(item.workout_type) : types.delete(item.workout_type))
  return normalizeWorkoutTypes([...types])
}

export async function listPlansForAdmin(profile) {
  const { data, error } = await supabase.from('workout_plans').select('*').eq('profile_id', profile.id).order('workout_type')
  if (error) throw error
  const saved = new Map((data || []).map((item) => [item.workout_type, item]))
  return WORKOUT_TYPES.map((type) => {
    const current = saved.get(type)
    const fallback = getWorkout(profile.name, type)
    return current || { profile_id: profile.id, workout_type: type, title: fallback?.title || `Treino ${type}`, description: fallback?.description || '', exercises: fallback?.exercises || [normalizeExercise({ name: 'Novo exercicio', muscleGroup: 'Geral', sets: 3, reps: '8-12', rest: 60 }, 0)], active: Boolean(fallback), fallback: true }
  })
}

export async function savePlan(profileId, plan) {
  const title = sanitizeText(plan.title, 120)
  if (!title) throw new Error('Informe o titulo do treino.')
  const exercises = (plan.exercises || []).map(normalizeExercise)
  if (!exercises.length) throw new Error('Adicione pelo menos um exercicio.')
  const { data, error } = await supabase.from('workout_plans').upsert({ profile_id: profileId, workout_type: plan.workout_type, title, description: sanitizeText(plan.description, 500), exercises, active: plan.active !== false, updated_at: new Date().toISOString() }, { onConflict: 'profile_id,workout_type' }).select('*').single()
  if (error) throw error
  return data
}
