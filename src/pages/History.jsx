import { Archive, Filter, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { archiveWorkoutSession, getWorkoutSessions } from '../services/workoutService'
import { friendlyError } from '../utils/validation'

export default function History() {
  const { profileId } = useParams()
  const [sessions, setSessions] = useState([])
  const [filters, setFilters] = useState({ type: '', gymName: '', from: '', to: '' })
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [archiving, setArchiving] = useState(null)

  function load() {
    getWorkoutSessions(profileId, filters).then(setSessions).catch((err) => setError(friendlyError(err)))
  }

  useEffect(() => { load() }, [profileId])

  async function archiveSession(session) {
    const confirmed = window.confirm(
      `Arquivar o treino ${session.workout_type} de ${session.date}? Voce podera restaura-lo depois.`
    )
    if (!confirmed) return

    setArchiving(session.id)
    setError('')
    try {
      await archiveWorkoutSession(session.id)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setArchiving(null)
    }
  }

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm font-bold text-emerald-300">Histórico</p>
        <h1 className="text-3xl font-black">Treinos feitos</h1>
      </header>

      <section className="card mb-4 grid gap-3 md:grid-cols-4">
        <label>
          <span className="mb-1 block text-sm text-slate-400">Tipo</span>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Todos</option>
            <option value="A">Treino A</option>
            <option value="B">Treino B</option>
            <option value="C">Treino C</option>
            <option value="D">Treino D</option>
            <option value="E">Treino E</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm text-slate-400">Academia</span>
          <input value={filters.gymName} onChange={(e) => setFilters({ ...filters, gymName: e.target.value })} placeholder="Nome" />
        </label>
        <label>
          <span className="mb-1 block text-sm text-slate-400">De</span>
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-sm text-slate-400">Até</span>
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </label>
        <button className="btn-secondary md:col-span-4 flex items-center justify-center gap-2" onClick={load}><Search size={18} /> Filtrar</button>
      </section>

      {error && <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-red-100">{error}</p>}
      {!sessions.length && <p className="text-slate-400">Nenhum treino encontrado.</p>}

      <div className="grid gap-4">
        {sessions.map((session) => {
          const exercises = session.workout_exercises || []
          const completed = exercises.filter((exercise) => exercise.completed).length
          return (
            <article key={session.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Treino {session.workout_type}</h2>
                  <p className="text-slate-400">{session.date} • {session.gym_name}</p>
                </div>
                <span className="badge">{completed}/{exercises.length} exercícios</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <p><span className="text-slate-500">Duração:</span> {session.duration_minutes} min</p>
                <p><span className="text-slate-500">Volume:</span> {Math.round(session.total_volume || 0)} kg</p>
                <p><span className="text-slate-500">Conclusão:</span> {session.completion_percentage}%</p>
                <p><span className="text-slate-500">Obs:</span> {session.notes || '-'}</p>
              </div>
              <button onClick={() => setOpen(open === session.id ? null : session.id)} className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-300"><Filter size={16} /> Detalhes do treino</button>
              <button
                type="button"
                disabled={archiving === session.id}
                onClick={() => archiveSession(session)}
                className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-300"
              >
                <Archive size={16} /> {archiving === session.id ? 'Arquivando...' : 'Arquivar treino'}
              </button>
              {open === session.id && (
                <div className="mt-3 space-y-2">
                  {exercises.map((exercise) => (
                    <div key={exercise.id} className="rounded-2xl bg-slate-950/60 p-3 text-sm">
                      <p className="font-bold">{exercise.exercise_name} {exercise.completed ? '✅' : '—'}</p>
                      <p className="text-slate-400">{exercise.sets} séries • meta {exercise.reps} • feitas {exercise.actual_reps || '-'} • {exercise.weight || 0} kg • {exercise.notes || 'sem observação'}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
