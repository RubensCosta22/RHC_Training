import { supabase } from '../lib/supabaseClient'
import { getWorkoutSessions } from './workoutService'
import { listMeasurements } from './measurementService'
import { toCsv, downloadFile } from '../utils/csvExport'

const MAX_BACKUP_BYTES = 10 * 1024 * 1024
const MAX_BACKUP_RECORDS = 5000
const MAX_BACKUP_DEPTH = 12
const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

function assertSafeJsonTree(value, depth = 0) {
  if (depth > MAX_BACKUP_DEPTH) throw new Error('Backup invalido: estrutura muito profunda.')
  if (value === null || typeof value !== 'object') return

  if (Array.isArray(value)) {
    for (const item of value) assertSafeJsonTree(item, depth + 1)
    return
  }

  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_JSON_KEYS.has(key)) throw new Error('Backup invalido: estrutura nao permitida.')
    assertSafeJsonTree(item, depth + 1)
  }
}

function assertJsonFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const type = String(file?.type || '').toLowerCase()
  const acceptedType = !type || type === 'application/json' || type === 'text/json'
  if (!acceptedType || (name && !name.endsWith('.json'))) {
    throw new Error('Selecione um arquivo JSON valido.')
  }
}

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
  assertJsonFile(file)
  if (file.size > MAX_BACKUP_BYTES) {
    throw new Error('Backup muito grande. Use um arquivo de ate 10 MB.')
  }

  const text = await file.text()
  const backup = JSON.parse(text)
  assertSafeJsonTree(backup)

  if (!backup || ![1, 2].includes(backup.version)) throw new Error('Backup invalido.')
  if (!Array.isArray(backup.sessions) || !Array.isArray(backup.measurements)) {
    throw new Error('Backup invalido: listas de dados ausentes.')
  }
  if (backup.sessions.length > MAX_BACKUP_RECORDS || backup.measurements.length > MAX_BACKUP_RECORDS) {
    throw new Error('Backup excede o limite seguro de registros.')
  }

  const { data, error } = await supabase.rpc('import_profile_backup_secure', {
    p_profile_id: profileId,
    p_backup: backup
  })

  if (error) throw error
  return data
}
