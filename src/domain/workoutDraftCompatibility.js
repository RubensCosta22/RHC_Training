export function classifyWorkoutDraftCompatibility(draft, currentPlanFingerprint) {
  if (!draft) return { status: 'none', canRestoreAutomatically: false }
  if (!draft.planFingerprint || !currentPlanFingerprint) {
    return { status: 'unknown', canRestoreAutomatically: false }
  }
  if (draft.planFingerprint === currentPlanFingerprint) {
    return { status: 'compatible', canRestoreAutomatically: true }
  }
  return { status: 'plan_changed', canRestoreAutomatically: false }
}

export function mapDraftExerciseValues(workout, saved = {}) {
  const mapped = {}
  const unapplied = []

  for (const exercise of workout?.exercises || []) {
    const stableKeys = [exercise.programExerciseId, exercise.id].filter(Boolean).map(String)
    const stableMatch = stableKeys.map((key) => saved[key]).find(Boolean)
    const controlledNameMatch = Object.values(saved).find((item) =>
      item?.originalName === exercise.name
      && (!item.selectedName || item.selectedName === exercise.name || (exercise.alternatives || []).includes(item.selectedName))
    )
    const candidate = stableMatch || controlledNameMatch
    if (candidate) mapped[exercise.id] = candidate
  }

  for (const [key, value] of Object.entries(saved || {})) {
    const applied = Object.values(mapped).includes(value)
    if (!applied) unapplied.push({ key, originalName: value?.originalName || null, selectedName: value?.selectedName || null })
  }

  return { mapped, unapplied }
}
