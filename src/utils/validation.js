export const LIMITS = {
  gymName: 80,
  notes: 500,
  shortText: 120
}

export function sanitizeText(value = '', maxLength = LIMITS.notes) {
  return String(value)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .slice(0, maxLength)
    .trim()
}

export function parsePositiveNumber(value, fieldLabel = 'valor') {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`${fieldLabel} não pode ser negativo.`)
  }
  return parsed
}

export function validateWorkoutInput({ gymName, durationMinutes, notes }) {
  const cleanGym = sanitizeText(gymName, LIMITS.gymName)
  const cleanNotes = sanitizeText(notes, LIMITS.notes)
  const duration = parsePositiveNumber(durationMinutes, 'Duração')

  if (!cleanGym) throw new Error('Informe a academia onde treinou.')
  if (cleanGym.length > LIMITS.gymName) throw new Error('Nome da academia muito longo.')
  if (cleanNotes.length > LIMITS.notes) throw new Error('Observação muito longa.')

  return { gymName: cleanGym, durationMinutes: duration || 0, notes: cleanNotes }
}

export function validateMeasurementInput(values) {
  const numericFields = ['weight', 'waist', 'chest', 'arm', 'thigh', 'hip']
  const clean = { ...values, notes: sanitizeText(values.notes, LIMITS.notes) }
  numericFields.forEach((field) => {
    clean[field] = parsePositiveNumber(values[field], field)
  })
  return clean
}

export function friendlyError(error) {
  if (!error) return 'Algo deu errado. Tente novamente.'
  const message = error.message || String(error)
  if (message.includes('JWT') || message.includes('permission') || message.includes('policy')) {
    return 'Você não tem permissão para fazer esta ação. Faça login novamente.'
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Falha de conexão. Verifique sua internet.'
  }
  if (message.length < 140 && !message.toLowerCase().includes('select') && !message.toLowerCase().includes('insert')) {
    return message
  }
  return 'Não foi possível concluir a ação com segurança. Tente novamente.'
}
