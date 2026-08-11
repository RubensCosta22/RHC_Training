import { Archive, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { archiveWorkoutSession, getWorkoutSessionsPage } from '../services/workoutService'
import { friendlyError } from '../utils/validation'
import PageHeader from '../components/ui/PageHeader'

const PAGE_SIZE = 10

function historyStatus(session) {
  const exercises = session.workout_exercises || []
  const isRunning = session.workout_type === 'E'
  const completedExercises = exercises.filter((exercise) => exercise.completed).length

  return {
    exercises,
    completionPercentage: 100,
    badge: isRunning
      ? 'Corrida concluída'
      : `${completedExercises}/${exercises.length} exercícios registrados`
  }
}

export default function History() {
  const { profileId } = useParams()
  const [sessions, setSessions] = useState([])
  const [filters, setFilters] = useState({ type: '', gymName: '', from: '', to: '' })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [archiving, setArchiving] = useState(null)

  function load(targetPage = page, targetFilters = appliedFilters) {
    setLoading(true)
    setError('')
    getWorkoutSessionsPage(profileId, targetFilters, { page: targetPage, pageSize: PAGE_SIZE })
      .then((result) => {
        setSessions(result.items)
        setTotal(result.total)
        setTotalPages(result.totalPages)
        setPage(result.page)
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1, appliedFilters) }, [profileId])

  function applyFilters(event) {
    event?.preventDefault()
    const next = { ...filters, gymName: filters.gymName.trim() }
    setAppliedFilters(next)
    setPage(1)
    load(1, next)
  }

  function clearFilters() {
    const empty = { type: '', gymName: '', from: '', to: '' }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
    load(1, empty)
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    setOpen(null)
    setPage(nextPage)
    load(nextPage, appliedFilters)
  }

  async function archiveSession(session) {
    const confirmed = window.confirm(
      `Arquivar o treino ${session.workout_type} de ${session.date}? Voce podera restaura-lo depois.`
    )
    if (!confirmed) return

    setArchiving(session.id)
    setError('')
    try {
      await archiveWorkoutSession(session.id)
      const nextPage = sessions.length === 1 && page > 1 ? page - 1 : page
      load(nextPage, appliedFilters)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setArchiving(null)
    }
  }

  const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastResult = Math.min(page * PAGE_SIZE, total)

  return (
    <div>
      <PageHeader eyebrow="Historico" title="Treinos feitos" subtitle="Sua trajetoria, sessao por sessao." />

      <form onSubmit={applyFilters} className="card mb-4 grid gap-3 md:grid-cols-4">
        <label>
          <span className="mb-1 block text-sm text-slate-400">Tipo</span>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Todos</option>
            <option value="A">Treino A</option>
            <option value="B">Treino B</option>
            <option value="C">Treino C</option>
            <option value="D">Treino D</option>
            <option value="E">Treino E</option>
            <option value="F">Treino F</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm text-slate-400">Buscar academia</span>
          <input value={filters.gymName} onChange={(e) => setFilters({ ...filters, gymName: e.target.value })} placeholder="Ex.: Gaviao" maxLength={80} />
        </label>
        <label>
          <span className="mb-1 block text-sm text-slate-400">De</span>
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-sm text-slate-400">Até</span>
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </label>
        <div className="flex gap-2 md:col-span-4">
          <button className="btn-secondary flex flex-1 items-center justify-center gap-2" type="submit"><Search size={18} /> Buscar e filtrar</button>
          <button className="btn-secondary px-4" type="button" onClick={clearFilters}>Limpar</button>
        </div>
      </form>

      {!loading && !error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
          <span>{total === 0 ? 'Nenhum resultado' : `${firstResult}-${lastResult} de ${total} treinos`}</span>
          <span>Página {page} de {totalPages}</span>
        </div>
      )}

      {loading && <p className="text-slate-400">Carregando historico...</p>}
      {error && <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-red-100">{error}</p>}
      {!loading && !sessions.length && <p className="text-slate-400">Nenhum treino encontrado.</p>}

      <div className="grid gap-4">
        {!loading && sessions.map((session) => {
          const { exercises, completionPercentage, badge } = historyStatus(session)
          return (
            <article key={session.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Treino {session.workout_type}</h2>
                  <p className="text-slate-400">{session.date} • {session.gym_name}</p>
                </div>
                <span className="badge">{badge}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <p><span className="text-slate-500">Duração:</span> {session.duration_minutes} min</p>
                <p><span className="text-slate-500">Volume:</span> {Math.round(session.total_volume || 0)} kg</p>
                <p><span className="text-slate-500">Conclusão:</span> {completionPercentage}%</p>
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
                  {session.workout_type === 'E' && !exercises.length && (
                    <div className="rounded-2xl bg-slate-950/60 p-3 text-sm text-slate-400">
                      Sessão de corrida concluída. Este treino não possui exercícios de musculação.
                    </div>
                  )}
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

      {!loading && totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginação do histórico">
          <button type="button" className="btn-secondary flex items-center gap-2" disabled={page === 1} onClick={() => goToPage(page - 1)}><ChevronLeft size={17} /> Anterior</button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button type="button" className="btn-secondary flex items-center gap-2" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>Próxima <ChevronRight size={17} /></button>
        </nav>
      )}
    </div>
  )
}
