import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ImageIcon,
  Minus,
  Plus,
  Repeat2,
  RotateCcw
} from 'lucide-react'
import { useState } from 'react'
import RestTimer from './RestTimer'
import { getProgressionStatus, getProgressionSuggestion } from '../utils/progression'
import { youtubeSearchUrl } from '../utils/youtube'

function getExerciseImage(exercise) {
  return `/exercise-images/${exercise.id}.webp`
}

function getInitialReps(exercise, value) {
  if (value.actualReps !== undefined && value.actualReps !== null && value.actualReps !== '') {
    const parsed = Number(String(value.actualReps).replace(/\D/g, ''))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }

  const match = String(exercise.reps || '').match(/\d+/)
  return match ? Number(match[0]) : 0
}

export default function ExerciseCard({ exercise, value = {}, record, onChange }) {
  const [showSwapOptions, setShowSwapOptions] = useState(false)
  const selectedName = value.selectedName || exercise.name
  const options = [exercise.name, ...(exercise.alternatives || [])]
  const isAlternative = selectedName !== exercise.name
  const completedSets = value.completedSets || Array(Number(exercise.sets || 0)).fill(false)
  const completedSetCount = completedSets.filter(Boolean).length
  const isExpanded = value.expanded !== false
  const repsValue = getInitialReps(exercise, value)
  const progression = getProgressionStatus(value.weight, record?.last_weight)
  const suggestion = getProgressionSuggestion(
    exercise,
    value.weight,
    value.completed,
    value.difficulty || 'normal',
    value.actualReps
  )

  function update(patch) {
    onChange({
      ...value,
      notes: value.notes || '',
      difficulty: value.difficulty || 'normal',
      ...patch
    })
  }

  function selectExercise(name) {
    update({
      selectedName: name,
      completed: false,
      completedSets: Array(Number(exercise.sets || 0)).fill(false),
      expanded: true
    })
    setShowSwapOptions(false)
  }

  function updateReps(nextValue) {
    const safeValue = Math.max(0, Number(nextValue) || 0)
    update({ actualReps: String(safeValue) })
  }

  function toggleSet(index) {
    const nextSets = completedSets.map((item, itemIndex) =>
      itemIndex === index ? !item : item
    )

    const completed = nextSets.length > 0 && nextSets.every(Boolean)

    update({
      completedSets: nextSets,
      completed,
      expanded: !completed,
      restTimerKey: nextSets[index] ? `${exercise.id}-${index}-${Date.now()}` : value.restTimerKey
    })
  }

  function toggleCompleted() {
    const completed = !value.completed

    update({
      completed,
      expanded: !completed,
      completedSets: completed
        ? Array(Number(exercise.sets || 0)).fill(true)
        : Array(Number(exercise.sets || 0)).fill(false)
    })
  }

  if (value.completed && !isExpanded) {
    return (
      <article className="rounded-3xl border border-emerald-400/30 bg-slate-900/90 p-4 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-slate-950">
              <Check size={21} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-black text-white line-through decoration-emerald-400/70">
                {selectedName}
              </h3>
              <p className="text-sm text-slate-400">
                {value.weight ? `${value.weight} kg` : 'Sem carga'} • {repsValue || '-'} reps • {completedSetCount}/{exercise.sets} séries
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => update({ expanded: true })}
            className="rounded-2xl bg-slate-800 p-3 text-slate-300"
            aria-label="Expandir exercício"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </article>
    )
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl shadow-black/20">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950">
        <img
          src={getExerciseImage(exercise)}
          alt={selectedName}
          className="h-full w-full object-cover opacity-80"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl border border-emerald-400/20 bg-slate-950/50 text-emerald-300 backdrop-blur">
            <ImageIcon size={28} />
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
              {exercise.muscleGroup}
            </p>
            <h3 className="truncate text-2xl font-black text-white">{selectedName}</h3>
          </div>

          <a
            href={youtubeSearchUrl(selectedName)}
            target="_blank"
            rel="noreferrer"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-700 bg-slate-950/80 text-slate-200 backdrop-blur transition hover:border-emerald-400 hover:text-emerald-300"
            aria-label="Ver execução"
          >
            <ExternalLink size={18} />
          </a>
        </div>

        {isAlternative && (
          <div className="absolute right-3 top-3 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
            substituído
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            {exercise.sets} séries • alvo {exercise.reps} • descanso {exercise.rest}s
          </p>

          <button
            type="button"
            onClick={toggleCompleted}
            className={`rounded-2xl p-3 transition ${
              value.completed
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            aria-label="Marcar exercício como feito"
          >
            {value.completed ? <ChevronUp size={22} /> : <CheckCircle2 size={22} />}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="rounded-3xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Carga
            </span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={value.weight || ''}
              onChange={(event) => update({ weight: event.target.value })}
              placeholder="0"
              className="border-0 bg-transparent p-0 text-2xl font-black text-white outline-none placeholder:text-slate-700"
            />
            <span className="text-xs text-slate-500">kg</span>
          </label>

          <div className="col-span-2 rounded-3xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Repetições
            </span>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => updateReps(repsValue - 1)}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-200 transition hover:bg-slate-700"
                aria-label="Diminuir repetições"
              >
                <Minus size={18} />
              </button>

              <p className="min-w-12 text-center text-3xl font-black text-white">
                {repsValue}
              </p>

              <button
                type="button"
                onClick={() => updateReps(repsValue + 1)}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-slate-950 transition hover:bg-emerald-300"
                aria-label="Aumentar repetições"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-950/60 p-3">
            <p className="text-slate-500">Última carga</p>
            <p className="font-bold">{record?.last_weight ?? '-'} kg</p>
          </div>

          <div className="rounded-2xl bg-slate-950/60 p-3">
            <p className="text-slate-500">Melhor carga</p>
            <p className="font-bold">{record?.best_weight ?? '-'} kg</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold">Séries</p>
            <p className="text-sm text-emerald-300">
              {completedSetCount} de {exercise.sets}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {completedSets.map((done, index) => (
              <button
                key={index}
                type="button"
                onClick={() => toggleSet(index)}
                className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                  done
                    ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-400'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <RestTimer seconds={Number(exercise.rest || 60)} autoStartKey={value.restTimerKey} />
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
          <p className="font-bold text-emerald-300">{progression}</p>
          <p className="mt-1 text-slate-400">{suggestion}</p>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setShowSwapOptions((current) => !current)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-slate-300"
          >
            <span className="inline-flex items-center gap-2">
              <RotateCcw size={16} />
              Trocar exercício
            </span>
            {showSwapOptions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showSwapOptions && (
            <div className="border-t border-slate-800 p-3">
              <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectExercise(option)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      selectedName === option
                        ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                        : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => update({ expanded: false })}
          className="btn-secondary mt-4 flex w-full items-center justify-center gap-2"
        >
          Minimizar <Repeat2 size={18} />
        </button>
      </div>
    </article>
  )
}