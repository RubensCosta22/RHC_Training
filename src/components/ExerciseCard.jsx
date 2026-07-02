import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ImageIcon,
  Repeat2,
  RotateCcw
} from 'lucide-react'
import RestTimer from './RestTimer'
import { getProgressionStatus, getProgressionSuggestion } from '../utils/progression'
import { youtubeSearchUrl } from '../utils/youtube'

export default function ExerciseCard({ exercise, value = {}, record, onChange }) {
  const selectedName = value.selectedName || exercise.name
  const options = [exercise.name, ...(exercise.alternatives || [])]
  const isAlternative = selectedName !== exercise.name
  const completedSets = value.completedSets || Array(Number(exercise.sets || 0)).fill(false)
  const completedSetCount = completedSets.filter(Boolean).length
  const isExpanded = value.expanded !== false
  const progression = getProgressionStatus(value.weight, record?.last_weight)
  const suggestion = getProgressionSuggestion(
    exercise,
    value.weight,
    value.completed,
    value.difficulty,
    value.actualReps
  )

  function update(patch) {
    onChange({ ...value, ...patch })
  }

  function selectExercise(name) {
    update({
      selectedName: name,
      completed: false,
      completedSets: Array(Number(exercise.sets || 0)).fill(false),
      expanded: true
    })
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
      <article className="rounded-3xl border border-emerald-400/30 bg-slate-900/80 p-4 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-slate-950">
              <Check size={20} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-black text-white line-through decoration-emerald-400/70">
                {selectedName}
              </h3>
              <p className="text-sm text-slate-400">
                {value.weight ? `${value.weight} kg` : 'Carga não informada'} • {completedSetCount}/{exercise.sets} séries
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
    <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/20">
      <div className="relative h-36 bg-gradient-to-br from-slate-800 to-slate-950">
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <ImageIcon size={34} />
          </div>
        </div>

        <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-emerald-300">
          {exercise.muscleGroup}
        </div>

        {isAlternative && (
          <div className="absolute right-3 top-3 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
            substituído
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-black">{selectedName}</h3>

            {isAlternative && (
              <p className="mt-1 text-xs text-slate-500">Original: {exercise.name}</p>
            )}

            <p className="mt-1 text-sm text-slate-400">
              {exercise.sets} séries • {exercise.reps} reps • descanso {exercise.rest}s
            </p>
          </div>

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

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold">Séries</p>
            <p className="text-sm text-emerald-300">
              {completedSetCount} de {exercise.sets} concluídas
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

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-950/60 p-3">
            <p className="text-slate-500">Última carga</p>
            <p className="font-bold">{record?.last_weight ?? '-'} kg</p>
          </div>

          <div className="rounded-2xl bg-slate-950/60 p-3">
            <p className="text-slate-500">Melhor carga</p>
            <p className="font-bold">{record?.best_weight ?? '-'} kg</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-300">
              Carga usada
            </span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={value.weight || ''}
              onChange={(event) => update({ weight: event.target.value })}
              placeholder="Ex: 40"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-300">
              Reps feitas
            </span>
            <input
              value={value.actualReps || ''}
              onChange={(event) => update({ actualReps: event.target.value })}
              maxLength={40}
              placeholder={`Ex: ${exercise.reps}`}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-300">
              Sensação
            </span>
            <select
              value={value.difficulty || 'normal'}
              onChange={(event) => update({ difficulty: event.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="easy">Fácil</option>
              <option value="hard">Difícil</option>
              <option value="pain">Dor/desconforto</option>
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-semibold text-slate-300">
            Observação
          </span>
          <textarea
            maxLength={500}
            rows="2"
            value={value.notes || ''}
            onChange={(event) => update({ notes: event.target.value })}
            placeholder="Ex: aumentar na próxima, máquina ocupada..."
          />
        </label>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="mb-2 text-sm font-bold text-slate-300">
            Trocar exercício
          </p>

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
                <RotateCcw size={12} />
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
          <p className="font-bold text-emerald-300">{progression}</p>
          <p className="mt-1 text-slate-400">{suggestion}</p>
        </div>

        <div className="mt-4">
          <RestTimer seconds={Number(exercise.rest || 60)} autoStartKey={value.restTimerKey} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={youtubeSearchUrl(selectedName)}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary flex items-center justify-center gap-2"
          >
            Ver vídeo <ExternalLink size={18} />
          </a>

          <button
            type="button"
            onClick={() => update({ expanded: false })}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            Minimizar <Repeat2 size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}