export function parseMaxRep(reps = '') {
  const matches = String(reps).match(/\d+/g)
  if (!matches) return null
  return Number(matches[matches.length - 1])
}

function parseBestActualRep(actualReps = '') {
  const matches = String(actualReps).match(/\d+/g)
  if (!matches) return null
  return Math.max(...matches.map(Number))
}

export function completedAtMaxReps(targetReps = '', actualReps = '') {
  const maxTarget = parseMaxRep(targetReps)
  const bestActual = parseBestActualRep(actualReps)
  if (!maxTarget || bestActual === null) return false
  return bestActual >= maxTarget
}

export function getProgressionStatus(currentWeight, previousWeight) {
  if (previousWeight === null || previousWeight === undefined) return 'Primeiro registro'
  const current = Number(currentWeight || 0)
  const previous = Number(previousWeight || 0)
  if (current > previous) return 'Aumentou carga'
  if (current === previous) return 'Manteve carga'
  return 'Reduziu carga'
}

export function getProgressionSuggestion(exercise, weight, completed, difficulty = 'normal', actualReps = '') {
  if (!completed) return 'Conclua o exercício para gerar sugestão.'
  if (difficulty === 'pain') return 'Dor registrada: mantenha ou reduza a carga e avalie orientação profissional.'
  if (difficulty === 'hard') return 'Foi difícil: mantenha a carga e priorize técnica no próximo treino.'

  const muscle = String(exercise.muscleGroup || '').toLowerCase()
  const isLower = ['perna', 'glúteo', 'gluteo', 'posterior', 'panturrilha', 'quadríceps', 'quadriceps'].some((item) => muscle.includes(item))
  const maxRep = parseMaxRep(exercise.reps)
  const increment = isLower ? '5 kg' : '2 a 2,5 kg'
  const reachedMax = completedAtMaxReps(exercise.reps, actualReps)

  if (!actualReps) {
    return maxRep
      ? `Informe as reps feitas. Se bateu ${maxRep} em todas as séries, aumente ${increment}.`
      : `Se concluiu com boa técnica, tente aumentar ${increment}.`
  }

  if (reachedMax && (difficulty === 'normal' || difficulty === 'easy')) {
    return `Meta máxima batida: no próximo treino, aumente ${increment}.`
  }

  return maxRep
    ? `Ainda não bateu o topo da faixa (${maxRep}). Mantenha a carga até completar com boa técnica.`
    : `Mantenha a carga até concluir com boa técnica e sensação controlada.`
}

export function calculateVolume(exercises = []) {
  return exercises.reduce((total, item) => {
    if (!item.completed) return total
    const repsText = item.actual_reps || item.actualReps || item.reps || ''
    const repsMatch = String(repsText).match(/\d+/g)
    const reps = repsMatch ? Number(repsMatch[repsMatch.length - 1]) : 1
    return total + Number(item.weight || 0) * Number(item.sets || 0) * reps
  }, 0)
}
