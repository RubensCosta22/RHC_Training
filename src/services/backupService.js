import { supabase } from '../lib/supabaseClient'
import { getWorkoutSessions } from './workoutService'
import { listMeasurements } from './measurementService'
import { toCsv, downloadFile } from '../utils/csvExport'

export async function exportHistoryCsv(profileId) {
  const sessions = await getWorkoutSessions(profileId)
  const rows = sessions.flatMap((session) =>
    (session.workout_exercises || []).map((exercise) => ({
      data: session.date,
      treino: session.workout_type,
      academia: session.gym_name,
      duracao_min: session.duration_minutes,
      volume_total: session.total_volume,
      exercicio: exercise.exercise_name,
      grupo: exercise.muscle_group,
      series: exercise.sets,
      reps_meta: exercise.reps,
      reps_feitas: exercise.actual_reps || '',
      carga: exercise.weight,
      concluido: exercise.completed ? 'sim' : 'nao',
      observacoes: exercise.notes || session.notes || ''
    }))
  )
  downloadFile(`historico-treino-${profileId}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
}

export async function exportHistoryJson(profileId) {
  const sessions = await getWorkoutSessions(profileId)
  const measurements = await listMeasurements(profileId)
  const backup = { version: 1, exported_at: new Date().toISOString(), profile_id: profileId, sessions, measurements }
  downloadFile(`backup-treino-${profileId}.json`, JSON.stringify(backup, null, 2), 'application/json')
}

export async function importBackupJson(profileId, file) {
  const text = await file.text()
  const backup = JSON.parse(text)
  if (!backup || backup.version !== 1) throw new Error('Backup inválido.')

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Faça login novamente para importar.')

  let importedSessions = 0
  for (const session of backup.sessions || []) {
    const { data: insertedSession, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        profile_id: profileId,
        workout_type: session.workout_type,
        date: session.date,
        gym_name: session.gym_name,
        duration_minutes: session.duration_minutes,
        completion_percentage: session.completion_percentage,
        total_volume: session.total_volume,
        notes: session.notes
      })
      .select('*')
      .single()
    if (sessionError) throw sessionError

    const exercises = (session.workout_exercises || []).map((exercise) => ({
      session_id: insertedSession.id,
      exercise_name: exercise.exercise_name,
      muscle_group: exercise.muscle_group,
      sets: exercise.sets,
      reps: exercise.reps,
      actual_reps: exercise.actual_reps || '',
      weight: exercise.weight,
      completed: exercise.completed,
      notes: exercise.notes
    }))
    if (exercises.length) {
      const { error: exerciseError } = await supabase.from('workout_exercises').insert(exercises)
      if (exerciseError) throw exerciseError
    }
    importedSessions += 1
  }

  const measurements = (backup.measurements || []).map((item) => ({
    user_id: userId,
    profile_id: profileId,
    date: item.date,
    weight: item.weight,
    waist: item.waist,
    chest: item.chest,
    arm: item.arm,
    thigh: item.thigh,
    hip: item.hip,
    notes: item.notes
  }))

  if (measurements.length) {
    const { error } = await supabase.from('body_measurements').insert(measurements)
    if (error) throw error
  }

  return { sessions: importedSessions, measurements: measurements.length }
}
