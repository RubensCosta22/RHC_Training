import { CheckCircle2, ExternalLink, Repeat2, RotateCcw } from 'lucide-react'
import RestTimer from './RestTimer'
import { getProgressionStatus, getProgressionSuggestion } from '../utils/progression'
import { youtubeSearchUrl } from '../utils/youtube'

export default function ExerciseCard({ exercise, value = {}, record, onChange }) {
  const selectedName = value.selectedName || exercise.name
  const options = [exercise.name, ...(exercise.alternatives || [])]
  const isAlternative = selectedName !== exercise.name
  const progression = getProgressionStatus(value.weight, record?.last_weight)
  const suggestion = getProgressionSuggestion(exercise, value.weight, value.completed, value.difficulty, value.actualReps)

  function update(patch) {
    onChange({ ...value, ...patch })
  }

  function selectExercise(name) {
    update({ selectedName: name })
  }

  return (
    <article className={`card border transition ${value.completed ? 'border-emerald-400/60 bg-emerald-400/5' : 'border-slate-800'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black">{selectedName}</h3>
            {isAlternative && <span className="badge-success inline-flex items-center gap-1"><Repeat2 size={12} /> substituído</span>}
          </div>
          {isAlternative && <p className="mt-1 text-xs text-slate-500">Original: {exercise.name}</p>}
          <p className="mt-1 text-sm text-slate-400">{exercise.muscleGroup} • {exercise.sets} séries • meta {exercise.reps}</p>
          <p className="mt-1 text-xs text-slate-500">Descanso: {exercise.rest}s • {exercise.goal}</p>
        </div>
        <button
          type="button"
          onClick={() => update({ completed: !value.completed })}
          className={`rounded-2xl p-3 transition ${value.completed ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          aria-label="Marcar exercício como feito"
        >
          <CheckCircle2 size={22} />
        </button>
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

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
        <p className="mb-2 text-sm font-bold text-slate-300">Trocar exercício, se a máquina estiver ocupada</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => selectExercise(option)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${selectedName === option ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-emerald-400'}`}
            >
              <RotateCcw size={12} /> {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-semibold text-slate-300">Carga usada (kg)</span>
          <input type="number" min="0" step="0.5" value={value.weight || ''} onChange={(event) => update({ weight: event.target.value })} placeholder="Ex: 40" />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-slate-300">Reps feitas</span>
          <input value={value.actualReps || ''} onChange={(event) => update({ actualReps: event.target.value })} maxLength={40} placeholder={`Ex: ${exercise.reps}`} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-slate-300">Sensação</span>
          <select value={value.difficulty || 'normal'} onChange={(event) => update({ difficulty: event.target.value })}>
            <option value="normal">Normal</option>
            <option value="easy">Fácil</option>
            <option value="hard">Difícil</option>
            <option value="pain">Dor/desconforto</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-semibold text-slate-300">Observação</span>
        <textarea maxLength={500} rows="2" value={value.notes || ''} onChange={(event) => update({ notes: event.target.value })} placeholder="Ex: aumentar na próxima, máquina ocupada..." />
      </label>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
          <p className="font-bold text-emerald-300">{progression}</p>
          <p className="mt-1 text-slate-400">{suggestion}</p>
        </div>
        <RestTimer seconds={Number(exercise.rest || 60)} />
      </div>

      <a href={youtubeSearchUrl(selectedName)} target="_blank" rel="noreferrer" className="btn-secondary mt-4 flex items-center justify-center gap-2">
        Ver execução <ExternalLink size={18} />
      </a>
    </article>
  )
}
