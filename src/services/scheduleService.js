import { supabase } from '../lib/supabaseClient'
import { requestedPlans } from '../data/requestedPlans'
import { savePlan } from './planService'

export async function createFamilyProfile(values) {
  const { data, error } = await supabase.rpc('create_family_profile', { p_name: values.name, p_age: Number(values.age), p_gender: values.gender, p_goal: values.goal, p_email: values.email })
  if (error) throw error
  return data
}

export async function getTodaySchedule(profileId) {
  const day = new Date().getDay()
  const { data, error } = await supabase.from('workout_weekly_schedule').select('workout_type').eq('profile_id',profileId).eq('day_of_week',day).maybeSingle()
  if (error) throw error
  return data ? { configured:true, workoutType:data.workout_type } : { configured:false, workoutType:null }
}

export async function saveWeeklySchedule(profileId, schedule) {
  const rows = Array.from({length:7},(_,day)=>({profile_id:profileId,day_of_week:day,workout_type:schedule[day] || null,updated_at:new Date().toISOString()}))
  const { error } = await supabase.from('workout_weekly_schedule').upsert(rows,{onConflict:'profile_id,day_of_week'})
  if (error) throw error
}

export async function listWeeklySchedules(profileIds) {
  if (!profileIds.length) return {}
  const { data, error } = await supabase.from('workout_weekly_schedule').select('profile_id,day_of_week,workout_type').in('profile_id', profileIds)
  if (error) throw error
  return (data || []).reduce((schedules, row) => {
    if (!schedules[row.profile_id]) schedules[row.profile_id] = Array(7).fill(null)
    schedules[row.profile_id][row.day_of_week] = row.workout_type
    return schedules
  }, {})
}

export async function applyRequestedPlan(profile) {
  const preset=requestedPlans[profile.name]
  if(!preset) throw new Error('Nao existe cronograma preparado para este perfil.')
  for(const plan of preset.plans) await savePlan(profile.id,{...plan,active:true,description:'Cronograma semanal personalizado'})
  await saveWeeklySchedule(profile.id,preset.schedule)
}
