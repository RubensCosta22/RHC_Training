import { Check, ChevronRight, Minus, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { calculateProgramSuggestion, getRecentProgramExposures } from '../services/programExecutionService'

function actionMeta(action) {
  if (action === 'increase') return { label: 'Aumentar', icon: TrendingUp }
  if (action === 'regress') return { label: 'Reduzir', icon: TrendingDown }
  if (action === 'hold') return { label: 'Manter', icon: Minus }
  return { label: 'Manual', icon: Check }
}

export default function SmartExecutionPanel({ exercise, value = {}, onChange }) {
  const [recent, setRecent] = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let active = true
    const variation = value.selectedName || exercise.name
    setHistoryLoaded(false)
    if (!exercise.programEnrollmentId || !exercise.programExerciseId || !variation) {
      setRecent([]); setHistoryLoaded(true); return undefined
    }
    getRecentProgramExposures(exercise.programEnrollmentId, exercise.programExerciseId, variation, 3)
      .then((items) => { if (active) { setRecent(items); setHistoryLoaded(true) } })
      .catch(() => { if (active) { setRecent([]); setHistoryLoaded(true) } })
    return () => { active = false }
  }, [exercise.programEnrollmentId, exercise.programExerciseId, exercise.name, value.selectedName])

  useEffect(() => { if (value.expanded === false) setMobileOpen(false) }, [value.expanded])

  const previousFailures = useMemo(() => {
    let count = 0
    for (const item of recent) {
      if (item.progression_action === 'increase') break
      if (item.progression_action === 'manual') continue
      count += 1
    }
    return count
  }, [recent])

  const setReps = Array.isArray(value.setReps) ? value.setReps : Array(Number(exercise.sets || 0)).fill('')
  const completedSetCount = (value.completedSets || []).filter(Boolean).length
  const allSetsCompleted = completedSetCount === Number(exercise.sets || 0)
  const allRepsFilled = setReps.length === Number(exercise.sets || 0) && setReps.every((rep) => rep !== '' && rep != null && Number(rep) >= 0)
  const hasRpe = value.rpe !== '' && value.rpe != null
  const canEvaluate = historyLoaded && recent.length > 0 && allSetsCompleted && allRepsFilled && hasRpe
  const suggestion = canEvaluate ? calculateProgramSuggestion(exercise, value, previousFailures) : null
  const meta = actionMeta(suggestion?.action)
  const ActionIcon = meta.icon
  const hasSmartData = setReps.some((rep) => rep !== '' && rep != null) || hasRpe
  const repsSummary = setReps.filter((rep) => rep !== '' && rep != null).join('/')

  function update(patch) { onChange({ ...value, ...patch }) }
  function updateSetRep(index, rawValue) {
    const next = [...setReps]
    next[index] = rawValue === '' ? '' : String(Math.max(0, Math.min(100, Number(rawValue) || 0)))
    update({ setReps: next })
  }

  function renderEditor() {
    return (
      <div>
        <p className="text-sm text-[#8E8E93]">{exercise.sets} séries · alvo {exercise.reps}{exercise.targetRpeMax ? ` · RPE ${exercise.targetRpeMin || '—'}–${exercise.targetRpeMax}` : ''}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {setReps.map((rep, index) => (
            <label key={index} className="rounded-lg bg-[#0A0A0B] p-3">
              <span className="text-xs font-semibold text-[#8E8E93]">Série {index + 1}</span>
              <input type="number" min="0" max="100" value={rep} onChange={(event) => updateSetRep(index, event.target.value)} placeholder={String(exercise.repsMin || '')} className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-semibold text-[#F5F5F7] outline-none" />
            </label>
          ))}
        </div>
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#8E8E93]">RPE</p>
        <div className="grid grid-cols-5 gap-2">
          {[6, 7, 8, 9, 10].map((rpe) => (
            <button key={rpe} type="button" onClick={() => update({ rpe })} className={`rounded-lg border py-2 text-sm font-semibold ${Number(value.rpe) === rpe ? 'border-[#C8FF3D] bg-[#C8FF3D] text-[#0A0A0B]' : 'border-[#2A2A2E] text-[#F5F5F7]'}`}>{rpe}</button>
          ))}
        </div>
        <div className="mt-4 border-t border-[#2A2A2E] pt-4">
          {!historyLoaded ? <p className="text-sm text-[#8E8E93]">Carregando histórico...</p> : recent.length === 0 ? <p className="text-sm text-[#8E8E93]">Primeiro registro. Salve o treino para criar seu baseline.</p> : !canEvaluate ? <p className="text-sm text-[#8E8E93]">Conclua as séries, reps e RPE para liberar a próxima recomendação.</p> : (
            <div className="flex items-start gap-3"><ActionIcon size={20} className="mt-0.5 text-[#C8FF3D]" /><div><p className="font-semibold text-[#F5F5F7]">Próximo treino: {meta.label}{suggestion.suggestedLoad != null ? ` ${suggestion.suggestedLoad} kg` : ''}</p><p className="mt-1 text-sm text-[#8E8E93]">{suggestion.reason}</p></div></div>
          )}
        </div>
      </div>
    )
  }

  if (value.expanded === false) return null

  return (
    <>
      <button type="button" onClick={() => setMobileOpen(true)} className="mt-1 flex w-full items-center justify-between border-b border-[#2A2A2E] px-0 py-3 text-left sm:hidden">
        <span><span className="block text-sm font-semibold text-[#F5F5F7]">Execução inteligente</span><span className="mt-0.5 block text-xs text-[#8E8E93]">{suggestion ? `Próximo treino: ${meta.label}${suggestion.suggestedLoad != null ? ` ${suggestion.suggestedLoad} kg` : ''}` : hasSmartData ? `${repsSummary || 'reps pendentes'}${hasRpe ? ` · RPE ${value.rpe}` : ''}` : 'Registrar reps e RPE'}</span></span>
        <ChevronRight size={18} className="text-[#8E8E93]" />
      </button>
      <div className="mt-2 hidden border-y border-[#2A2A2E] py-4 sm:block">{renderEditor()}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] sm:hidden" role="dialog" aria-modal="true" aria-label="Execução inteligente">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} aria-label="Fechar execução inteligente" />
          <section className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-2xl border-t border-[#2A2A2E] bg-[#141416] px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#3A3A3E]" />
            <div className="mb-4 flex items-center justify-between"><div><p className="text-xs text-[#8E8E93]">{exercise.name}</p><h3 className="text-lg font-semibold text-[#F5F5F7]">Execução inteligente</h3></div><button type="button" onClick={() => setMobileOpen(false)} className="grid h-10 w-10 place-items-center text-[#8E8E93]" aria-label="Fechar"><X size={20} /></button></div>
            {renderEditor()}
            <button type="button" onClick={() => setMobileOpen(false)} className="mt-5 w-full rounded-lg bg-[#C8FF3D] px-4 py-3 text-sm font-semibold text-[#0A0A0B]">Confirmar</button>
          </section>
        </div>
      )}
    </>
  )
}
