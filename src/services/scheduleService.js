import { supabase } from '../lib/supabaseClient'
import { requestedPlans } from '../data/requestedPlans'
import { sanitizeText } from '../utils/validation'
import { associateProfileEmail } from './familyService'
import { savePlan } from './planService'

export async function createFamilyProfile(values) {
  const name = sanitizeText(values.name, 80)
  const goal = sanitizeText(values.goal, 200)
  if (!name) throw new Error('Informe o nome do perfil.')

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      name,
      birth_date: values.birthDate || null,
      gender: values.gender || null,
      goal: goal || null,
      is_active: true
    })
    .select('*')
    .single()
  if (error) throw error

  try {
    if (values.email) await associateProfileEmail(profile.id, values.email)
  } catch (inviteError) {
    await supabase.from('profiles').update({ is_active: false }).eq('id', profile.id)
    throw inviteError
  }

  return profile
}

export async function getTodaySchedule(profileId) {
  const day = new Date().getDay()
  const { data, error } = await supabase
    .from('profile_weekly_schedule')
    .select('workout_code')
    .eq('profile_id', profileId)
    .eq('day_of_week', day)
    .maybeSingle()
  if (error) throw error
  return data ? { configured: true, workoutType: data.workout_code } : { configured: false, workoutType: null }
}

export async function saveWeeklySchedule(profileId, schedule) {
  const rows = Array.from({ length: 7 }, (_, day) => ({
    profile_id: profileId,
    day_of_week: day,
    workout_code: schedule[day] || null,
    updated_at: new Date().toISOString()
  }))
  const { error } = await supabase.from('profile_weekly_schedule').upsert(rows, { onConflict: 'profile_id,day_of_week' })
  if (error) throw error
}

export async function listWeeklySchedules(profileIds) {
  if (!profileIds.length) return {}
  const { data, error } = await supabase
    .from('profile_weekly_schedule')
    .select('profile_id,day_of_week,workout_code')
    .in('profile_id', profileIds)
  if (error) throw error
  return (data || []).reduce((schedules, row) => {
    if (!schedules[row.profile_id]) schedules[row.profile_id] = Array(7).fill(null)
    schedules[row.profile_id][row.day_of_week] = row.workout_code
    return schedules
  }, {})
}

export async function applyRequestedPlan(profile) {
  const preset = requestedPlans[profile.name]
  if (!preset) throw new Error('Nao existe cronograma preparado para este perfil.')
  for (const plan of preset.plans) await savePlan(profile.id, { ...plan, active: true, description: 'Cronograma semanal personalizado' })
  await saveWeeklySchedule(profile.id, preset.schedule)
}
