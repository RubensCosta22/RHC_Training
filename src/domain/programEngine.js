function roundLoad(value, increment) {
  const step = Number(increment || 0)
  if (!step || step <= 0) return Number(value || 0)
  return Math.round(Number(value || 0) / step) * step
}

export function evaluateLoadProgression({
  currentLoad,
  completedSets,
  targetSets,
  reps = [],
  repsMin,
  targetRpeMax,
  observedRpe,
  failedExposureCount = 0,
  failuresBeforeRegression = 2,
  loadIncrement,
  regressionPercent = 7.5
}) {
  const load = Number(currentLoad || 0)
  const allSetsCompleted = Number(completedSets || 0) >= Number(targetSets || 0)
  const allRepsReached = reps.length >= Number(targetSets || 0) && reps.every((value) => Number(value) >= Number(repsMin || 0))
  const rpeControlled = observedRpe == null || targetRpeMax == null || Number(observedRpe) <= Number(targetRpeMax)

  if (allSetsCompleted && allRepsReached && rpeControlled) {
    const suggestedLoad = roundLoad(load + Number(loadIncrement || 0), loadIncrement)
    return {
      action: loadIncrement ? 'increase' : 'hold',
      suggestedLoad,
      reason: loadIncrement
        ? 'Meta concluída dentro da faixa de repetições e do RPE alvo.'
        : 'Meta concluída; incremento da máquina ainda não foi configurado.'
    }
  }

  if (Number(failedExposureCount || 0) + 1 >= Number(failuresBeforeRegression || 2)) {
    const reduced = load * (1 - Number(regressionPercent || 0) / 100)
    return {
      action: 'regress',
      suggestedLoad: roundLoad(reduced, loadIncrement),
      reason: 'Meta não atingida em exposições consecutivas; regressão sugerida.'
    }
  }

  return {
    action: 'hold',
    suggestedLoad: load,
    reason: 'Mantenha a carga e repita a meta antes de progredir.'
  }
}

export function evaluateDoubleProgression({
  currentLoad,
  reps = [],
  targetSets,
  repsMax,
  targetRpeMax,
  observedRpe,
  loadIncrement
}) {
  const load = Number(currentLoad || 0)
  const reachedTop = reps.length >= Number(targetSets || 0) && reps.every((value) => Number(value) >= Number(repsMax || 0))
  const rpeControlled = observedRpe == null || targetRpeMax == null || Number(observedRpe) <= Number(targetRpeMax)

  if (reachedTop && rpeControlled && Number(loadIncrement || 0) > 0) {
    return {
      action: 'increase',
      suggestedLoad: roundLoad(load + Number(loadIncrement), loadIncrement),
      reason: 'Topo da faixa atingido em todas as séries com RPE controlado.'
    }
  }

  return {
    action: 'hold',
    suggestedLoad: load,
    reason: 'Permaneça na carga atual até atingir o topo da faixa em todas as séries.'
  }
}

export function getProgramWeek(startDate, today = new Date()) {
  if (!startDate) return 1
  const start = new Date(`${startDate}T00:00:00`)
  const current = today instanceof Date ? today : new Date(today)
  const days = Math.max(0, Math.floor((current - start) / 86400000))
  return Math.floor(days / 7) + 1
}
