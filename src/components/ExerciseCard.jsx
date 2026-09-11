import { Check, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, ExternalLink, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import RestTimer from './RestTimer'
import { getRecentProgramExposures } from '../services/programExecutionService'
import { youtubeSearchUrl } from '../utils/youtube'

function getInitialReps(exercise, value) {
  if (value.actualReps !== undefined && value.actualReps !== null && value.actualReps !== '') {
    const firstValue = String(value.actualReps).split('/')[0]
    const parsed = Number(firstValue.replace(/\D/g, ''))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }
  const match = String(exercise.reps || '').match(/\d+/)
  return match ? Number(match[0]) : 0
}

function recommendationLabel(action) {
  if (action === 'increase') return 'Aumentar'
  if (action === 'regress') return 'Reduzir'
  if (action === 'hold') return 'Manter'
  return null
}

function formatRpe(value) {
  if (value == null || value === '') return null
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export default function ExerciseCard({ exercise, value = {}, record, onChange }) {
  const [showSwapOptions, setShowSwapOptions] = useState(false)
  const [recommendation, setRecommendation] = useState(null)
  const selectedName = value.selectedName || exercise.name
  const alternatives = exercise.alternatives || []
  const options = [exercise.name, ...alternatives]
  const completedSets = value.completedSets || Array(Number(exercise.sets || 0)).fill(false)
  const completedSetCount = completedSets.filter(Boolean).length
  const isExpanded = value.expanded !== false
  const showDetails = value.detailsOpen === true
  const repsValue = getInitialReps(exercise, value)
  const hasPreviousLoad = record?.last_weight != null && Number(record.last_weight) > 0
  const hasBestLoad = record?.best_weight != null && Number(record.best_weight) > 0
  const recommendationAction = recommendationLabel(recommendation?.progression_action)
  const hasRecommendation = recommendationAction && recommendation?.suggested_load != null
  const targetRpeMin = formatRpe(exercise.targetRpeMin)
  const targetRpeMax = formatRpe(exercise.targetRpeMax)
  const targetRpeLabel = targetRpeMin && targetRpeMax
    ? `${targetRpeMin}–${targetRpeMax}`
    : (targetRpeMax || targetRpeMin)

  useEffect(() => {
    let active = true
    setRecommendation(null)
    if (!exercise.programEnrollmentId || !exercise.programExerciseId || !selectedName) return undefined

    getRecentProgramExposures(exercise.programEnrollmentId, exercise.programExerciseId, selectedName, 1)
      .then((items) => { if (active) setRecommendation(items[0] || null) })
      .catch(() => { if (active) setRecommendation(null) })

    return () => { active = false }
  }, [exercise.programEnrollmentId, exercise.programExerciseId, selectedName])

  function update(patch) {
    onChange({ ...value, notes: value.notes || '', difficulty: value.difficulty || 'normal', ...patch })
  }

  function selectExercise(name) {
    update({ selectedName: name, completed: false, completedSets: Array(Number(exercise.sets || 0)).fill(false), expanded: true })
    setShowSwapOptions(false)
  }

  function toggleSet(index) {
    const nextSets = completedSets.map((item, itemIndex) => itemIndex === index ? !item : item)
    const completed = nextSets.length > 0 && nextSets.every(Boolean)
    update({
      completedSets: nextSets,
      completed,
      expanded: !completed,
      detailsOpen: completed ? false : showDetails,
      restTimerKey: nextSets[index] ? `${exercise.id}-${index}-${Date.now()}` : value.restTimerKey
    })
  }

  function toggleCompleted() {
    const completed = !value.completed
    update({
      completed,
      expanded: !completed,
      detailsOpen: false,
      completedSets: completed ? Array(Number(exercise.sets || 0)).fill(true) : Array(Number(exercise.sets || 0)).fill(false)
    })
  }

  if (value.completed && !isExpanded) {
    return (
      <article className="border-b border-[#2A2A2E] py-4 opacity-55">
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleCompleted} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F5F5F7] text-[#0A0A0B]" aria-label="Reabrir exercício">
            <Check size={21} />
          </button>
          <button type="button" onClick={() => update({ expanded: true, detailsOpen: true })} className="min-w-0 flex-1 text-left">
            <h3 className="truncate text-base font-semibold text-[#F5F5F7]">{selectedName}</h3>
            <p className="mt-1 text-sm text-[#8E8E93]">{exercise.sets} × {repsValue || exercise.reps}{value.weight ? ` · ${value.weight} kg` : ''}{value.rpe ? ` · RPE ${value.rpe}` : ''}</p>
          </button>
          <ChevronRight size={20} className="text-[#8E8E93]" />
        </div>
      </article>
    )
  }

  return (
    <article className="border-b border-[#2A2A2E] py-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={toggleCompleted} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#2A2A2E] text-[#8E8E93]" aria-label="Concluir exercício">
          <CheckCircle2 size={22} />
        </button>
        <button type="button" onClick={() => update({ detailsOpen: !showDetails })} className="min-w-0 flex-1 text-left">
          <h3 className="truncate text-lg font-semibold text-[#F5F5F7]">{selectedName}</h3>
          <p className="mt-1 text-sm text-[#8E8E93]">{exercise.sets} × {exercise.reps}{value.weight ? ` · ${value.weight} kg` : hasPreviousLoad ? ` · última ${record.last_weight} kg` : ''}{targetRpeLabel ? ` · RPE alvo ${targetRpeLabel}` : ''}</p>
        </button>
        {showDetails ? <ChevronUp size={20} className="text-[#8E8E93]" /> : <ChevronDown size={20} className="text-[#8E8E93]" />}
      </div>

      {showDetails && (
        <div className="mt-4 pl-0 sm:pl-14">
          <div className="mb-3 flex items-center justify-between gap-3 border-y border-[#2A2A2E] py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8E8E93]">Referência</p>
              <p className="mt-1 text-sm text-[#F5F5F7]">
                {hasPreviousLoad ? `Última carga ${record.last_weight} kg` : 'Sem carga anterior registrada'}
                {hasBestLoad ? ` · melhor ${record.best_weight} kg` : ''}
              </p>
              {hasRecommendation && (
                <p className="mt-1 text-sm font-semibold text-[#C8FF3D]">Recomendação {recommendation.suggested_load} kg · {recommendationAction}</p>
              )}
              {targetRpeLabel && (
                <p className="mt-1 text-sm text-[#F5F5F7]">RPE alvo {targetRpeLabel}</p>
              )}
              {hasPreviousLoad && record.exact_match === false && (
                <p className="mt-1 text-xs text-[#8E8E93]">Histórico equivalente: {record.matched_name}</p>
              )}
            </div>
            <a href={youtubeSearchUrl(selectedName)} target="_blank" rel="noreferrer" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-[#2A2A2E] px-3 text-sm font-semibold text-[#F5F5F7] transition hover:border-[#C8FF3D]/60 hover:text-[#C8FF3D]" aria-label={`Ver execução de ${selectedName}`} title="Ver execução">
              <ExternalLink size={17} />
              <span className="hidden sm:inline">Ver execução</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-lg bg-[#141416] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8E8E93]">Carga (kg)</span>
              <input type="number" min="0" step="0.5" value={value.weight || ''} onChange={(event) => update({ weight: event.target.value })} placeholder={hasPreviousLoad ? String(record.last_weight) : '0'} className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-semibold text-[#F5F5F7] outline-none" />
            </label>
            {exercise.programExerciseId ? (
              <div className="rounded-lg bg-[#141416] p-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8E8E93]">Séries</span>
                <p className="mt-1 text-2xl font-semibold text-[#F5F5F7]">{completedSetCount}/{exercise.sets}</p>
              </div>
            ) : (
              <label className="rounded-lg bg-[#141416] p-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8E8E93]">Repetições</span>
                <input type="number" min="0" value={value.actualReps || ''} onChange={(event) => update({ actualReps: String(Math.max(0, Number(event.target.value) || 0)) })} placeholder={String(repsValue || '')} className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-semibold text-[#F5F5F7] outline-none" />
              </label>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[#8E8E93]"><span>Séries</span><span>{completedSetCount} de {exercise.sets}</span></div>
          <div className="mt-2 flex gap-2">
            {completedSets.map((done, index) => (
              <button key={index} type="button" onClick={() => toggleSet(index)} className={`grid h-11 flex-1 place-items-center rounded-lg border text-sm font-semibold transition ${done ? 'border-[#C8FF3D] bg-[#C8FF3D] text-[#0A0A0B]' : 'border-[#2A2A2E] bg-[#141416] text-[#F5F5F7]'}`} aria-label={`Marcar série ${index + 1}`}>
                {done ? <Check size={18} /> : index + 1}
              </button>
            ))}
          </div>

          <div className="mt-3"><RestTimer seconds={Number(exercise.rest || 60)} autoStartKey={value.restTimerKey} /></div>

          <div className="mt-4 divide-y divide-[#2A2A2E] border-y border-[#2A2A2E]">
            {alternatives.length > 0 && (
              <>
                <button type="button" onClick={() => setShowSwapOptions((current) => !current)} className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-[#F5F5F7]">
                  <span className="inline-flex items-center gap-2"><RotateCcw size={16} />Trocar exercício <span className="font-normal text-[#8E8E93]">({alternatives.length})</span></span>
                  {showSwapOptions ? <ChevronUp size={18} /> : <ChevronDown size={18} className="text-[#8E8E93]" />}
                </button>
                {showSwapOptions && (
                  <div className="pb-3">
                    {options.filter((option) => option !== selectedName).map((option) => (
                      <button key={option} type="button" onClick={() => selectExercise(option)} className="flex w-full items-center justify-between border-t border-[#2A2A2E] py-3 text-left text-sm text-[#F5F5F7] first:border-0">{option}<ChevronRight size={18} className="text-[#8E8E93]" /></button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
