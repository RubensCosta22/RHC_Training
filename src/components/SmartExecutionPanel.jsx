import { Check, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  calculateProgramSuggestion,
  getRecentProgramExposures
} from '../services/programExecutionService'

function actionMeta(action) {
  if (action === 'increase') return { label: 'Aumentar', icon: TrendingUp }
  if (action === 'regress') return { label: 'Reduzir', icon: TrendingDown }
  if (action === 'hold') return { label: 'Manter', icon: Minus }
  return { label: 'Manual', icon: Check }
}

export default function SmartExecutionPanel({ exercise, value = {}, onChange }) {
  const [recent, setRecent] = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  useEffect(() => {
    let active = true
    const variation = value.selectedName || exercise.name

    setHistoryLoaded(false)

    if (!exercise.programEnrollmentId || !exercise.programExerciseId || !variation) {
      setRecent([])
      setHistoryLoaded(true)
      return undefined
    }

    getRecentProgramExposures(
      exercise.programEnrollmentId,
      exercise.programExerciseId,
      variation,
      3
    )
      .then((items) => {
        if (active) {
          setRecent(items)
          setHistoryLoaded(true)
        }
      })
      .catch(() => {
        if (active) {
          setRecent([])
          setHistoryLoaded(true)
        }
      })

    return () => {
      active = false
    }
  }, [exercise.programEnrollmentId, exercise.programExerciseId, exercise.name, value.selectedName])

  const previousFailures = useMemo(() => {
    let count = 0
    for (const item of recent) {
      if (item.progression_action === 'increase') break
      if (item.progression_action === 'manual') continue
      count += 1
    }
    return count
  }, [recent])

  const setReps = Array.isArray(value.setReps)
    ? value.setReps
    : Array(Number(exercise.sets || 0)).fill('')

  const completedSetCount = (value.completedSets || []).filter(Boolean).length
  const allSetsCompleted = completedSetCount === Number(exercise.sets || 0)
  const allRepsFilled = setReps.length === Number(exercise.sets || 0)
    && setReps.every((rep) => rep !== '' && rep != null && Number(rep) >= 0)
  const hasRpe = value.rpe !== '' && value.rpe != null
  const canEvaluate = historyLoaded && recent.length > 0 && allSetsCompleted && allRepsFilled && hasRpe

  const suggestion = canEvaluate
    ? calculateProgramSuggestion(exercise, value, previousFailures)
    : null
  const meta = actionMeta(suggestion?.action)
  const ActionIcon = meta.icon

  function update(patch) {
    onChange({ ...value, ...patch })
  }

  function updateSetRep(index, rawValue) {
    const next = [...setReps]
    const clean = rawValue === '' ? '' : String(Math.max(0, Math.min(100, Number(rawValue) || 0)))
    next[index] = clean

    // Repetições por série pertencem somente ao motor do programa.
    // Não escrevemos em actualReps para evitar 10/10/10 virar 101010 no contador legado.
    update({ setReps: next })
  }

  return (
    <div className="mt-2 border border-emerald-400/20 bg-emerald-400/[0.035] p-3 sm:rounded-xl sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="rhc-kicker">Execução inteligente</p>
          <p className="mt-1 text-sm text-slate-300">
            {exercise.role || 'exercício'} • alvo {exercise.reps}
            {exercise.targetRpeMax ? ` • RPE ${exercise.targetRpeMin || '—'}–${exercise.targetRpeMax}` : ''}
          </p>
        </div>

        <div className="w-fit max-w-full rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300">
          {exercise.progressionType === 'double_progression' ? 'Double progression' : 'Progressão de carga'}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {setReps.map((rep, index) => (
          <label key={index} className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Série {index + 1}
            </span>
            <input
              type="number"
              min="0"
              max="100"
              value={rep}
              onChange={(event) => updateSetRep(index, event.target.value)}
              placeholder={String(exercise.repsMin || '')}
              className="mt-1 w-full border-0 bg-transparent p-0 text-xl font-black text-white outline-none"
            />
            <span className="text-[11px] text-slate-500">reps</span>
          </label>
        ))}
      </div>

      <div className="mt-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">RPE da execução</p>
        <div className="grid grid-cols-5 gap-1.5">
          {[6, 7, 8, 9, 10].map((rpe) => (
            <button
              key={rpe}
              type="button"
              onClick={() => update({ rpe })}
              className={`rounded-lg border px-1.5 py-2 text-sm font-black transition ${
                Number(value.rpe) === rpe
                  ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400'
              }`}
            >
              {rpe}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">6 = confortável • 8 ≈ 2 reps em reserva • 10 = esforço máximo</p>
      </div>

      <div className="mt-3 border-t border-slate-800 pt-3">
        {!historyLoaded ? (
          <p className="text-sm text-slate-400">Carregando histórico deste exercício...</p>
        ) : recent.length === 0 ? (
          <div>
            <p className="text-sm font-black text-white">Primeira execução</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Conclua e salve este treino para criar o baseline. A sugestão de carga começa na próxima exposição.</p>
          </div>
        ) : !canEvaluate ? (
          <div>
            <p className="text-sm font-black text-white">Sugestão após a execução</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Conclua todas as séries, informe as repetições e registre o RPE para liberar a recomendação.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-800 text-emerald-300">
                <ActionIcon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">
                  {meta.label}
                  {suggestion.suggestedLoad != null ? ` • ${suggestion.suggestedLoad} kg` : ''}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{suggestion.reason}</p>
              </div>
            </div>

            {suggestion.action !== 'manual' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update({ progressionAccepted: true })}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    value.progressionAccepted === true
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  Aceitar sugestão
                </button>
                <button
                  type="button"
                  onClick={() => update({ progressionAccepted: false })}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    value.progressionAccepted === false
                      ? 'bg-white text-slate-950'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  Manter decisão
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
