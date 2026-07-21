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

  useEffect(() => {
    let active = true
    const variation = value.selectedName || exercise.name

    if (!exercise.programEnrollmentId || !exercise.programExerciseId || !variation) return undefined

    getRecentProgramExposures(
      exercise.programEnrollmentId,
      exercise.programExerciseId,
      variation,
      3
    )
      .then((items) => {
        if (active) setRecent(items)
      })
      .catch(() => {
        if (active) setRecent([])
      })

    return () => {
      active = false
    }
  }, [exercise.programEnrollmentId, exercise.programExerciseId, exercise.name, value.selectedName])

  const previousFailures = useMemo(() => {
    let count = 0
    for (const item of recent) {
      if (item.progression_action === 'increase') break
      count += 1
    }
    return count
  }, [recent])

  const suggestion = calculateProgramSuggestion(exercise, value, previousFailures)
  const meta = actionMeta(suggestion.action)
  const ActionIcon = meta.icon
  const setReps = Array.isArray(value.setReps)
    ? value.setReps
    : Array(Number(exercise.sets || 0)).fill('')

  function update(patch) {
    onChange({ ...value, ...patch })
  }

  function updateSetRep(index, rawValue) {
    const next = [...setReps]
    const clean = rawValue === '' ? '' : String(Math.max(0, Math.min(100, Number(rawValue) || 0)))
    next[index] = clean
    update({ setReps: next, actualReps: next.filter((item) => item !== '').join('/') })
  }

  return (
    <div className="mt-3 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="rhc-kicker">Execução inteligente</p>
          <p className="mt-1 text-sm text-slate-300">
            {exercise.role || 'exercício'} • alvo {exercise.reps}
            {exercise.targetRpeMax ? ` • RPE ${exercise.targetRpeMin || '—'}–${exercise.targetRpeMax}` : ''}
          </p>
        </div>

        <div className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300">
          {exercise.progressionType === 'double_progression' ? 'Double progression' : 'Progressão de carga'}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {setReps.map((rep, index) => (
          <label key={index} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Série {index + 1}
            </span>
            <input
              type="number"
              min="0"
              max="100"
              value={rep}
              onChange={(event) => updateSetRep(index, event.target.value)}
              placeholder={String(exercise.repsMin || '')}
              className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-black text-white outline-none"
            />
            <span className="text-xs text-slate-500">reps</span>
          </label>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">RPE da execução</p>
        <div className="grid grid-cols-5 gap-2">
          {[6, 7, 8, 9, 10].map((rpe) => (
            <button
              key={rpe}
              type="button"
              onClick={() => update({ rpe })}
              className={`rounded-2xl border px-2 py-3 text-sm font-black transition ${
                Number(value.rpe) === rpe
                  ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400'
              }`}
            >
              {rpe}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">6 = confortável • 8 ≈ 2 reps em reserva • 10 = esforço máximo</p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-emerald-300">
            <ActionIcon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">
              {meta.label}
              {suggestion.suggestedLoad != null ? ` • ${suggestion.suggestedLoad} kg` : ''}
            </p>
            <p className="mt-1 text-sm text-slate-400">{suggestion.reason}</p>
          </div>
        </div>

        {suggestion.action !== 'manual' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update({ progressionAccepted: true })}
              className={`rounded-2xl px-3 py-2 text-sm font-bold transition ${
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
              className={`rounded-2xl px-3 py-2 text-sm font-bold transition ${
                value.progressionAccepted === false
                  ? 'bg-white text-slate-950'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              Manter minha decisão
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
