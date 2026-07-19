import { supabase } from '../lib/supabaseClient'
import { getWorkout, getWorkoutTypes } from '../data/workouts'
import { sanitizeText } from '../utils/validation'

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

export async function getWorkoutPlan(profile, type) {
  const { data, error } = await supabase.from('workout_plans').select('*').eq('profile_id', profile.id).eq('workout_type', type).maybeSingle()
  if (error) throw error
  if (data && !data.active) return null
  if (!data) return getWorkout(profile.name, type)
  return { title: data.title, description: data.description, exercises: (data.exercises || []).filter((item) => item.active !== false) }
}

export async function getAvailablePlanTypes(profile) {
  const { data, error } = await supabase.from('workout_plans').select('workout_type,active').eq('profile_id', profile.id).order('workout_type')
  if (error) throw error
  const types = new Set(getWorkoutTypes(profile.name))
  ;(data || []).forEach((item) => item.active ? types.add(item.workout_type) : types.delete(item.workout_type))
  return [...types].sort()
}

export async function listPlansForAdmin(profile) {
  const { data, error } = await supabase.from('workout_plans').select('*').eq('profile_id', profile.id).order('workout_type')
  if (error) throw error
  const saved = new Map((data || []).map((item) => [item.workout_type, item]))
  return ['A','B','C','D','E'].map((type) => {
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
