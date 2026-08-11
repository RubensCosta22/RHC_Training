import { Archive, RotateCcw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import { listArchivedItems, restoreArchivedItem } from '../services/archiveService'
import { friendlyError } from '../utils/validation'

const sections = [
  { key: 'workouts', table: 'workout_sessions', title: 'Treinos' },
  { key: 'measurements', table: 'body_measurements', title: 'Medidas' },
  { key: 'photos', table: 'progress_photos', title: 'Fotos' }
]

function itemTitle(section, item) {
  if (section.key === 'workouts') return `Treino ${item.workout_type}`
  if (section.key === 'measurements') return `Medidas de ${item.date}`
  return `Foto ${item.photo_type}`
}

export default function Archived() {
  const { profileId } = useParams()
  const [items, setItems] = useState({ workouts: [], measurements: [], photos: [] })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(null)
  const [message, setMessage] = useState('')

  function load() {
    setLoading(true)
    listArchivedItems(profileId)
      .then(setItems)
      .catch((error) => setMessage(friendlyError(error)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [profileId])

  async function restore(table, item) {
    setRestoring(item.id)
    setMessage('')
    try {
      await restoreArchivedItem(table, item.id)
      await load()
      setMessage('Item restaurado com sucesso.')
    } catch (error) {
      setMessage(friendlyError(error))
    } finally {
      setRestoring(null)
    }
  }

  const filteredSections = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return sections.map((section) => {
      if (category !== 'all' && category !== section.key) return { ...section, items: [] }
      const sectionItems = items[section.key].filter((item) => {
        if (!term) return true
        const searchable = [itemTitle(section, item), item.date, item.gym_name, item.photo_type, item.notes]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')
        return searchable.includes(term)
      })
      return { ...section, items: sectionItems }
    })
  }, [items, query, category])

  const total = filteredSections.reduce((sum, section) => sum + section.items.length, 0)

  return (
    <div>
      <PageHeader
        eyebrow="Seguranca dos dados"
        title="Arquivados"
        subtitle="Restaure itens sem perder o historico."
      />

      <section className="card mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
        <label>
          <span className="mb-1 block text-sm text-slate-400">Buscar arquivados</span>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Treino, data, academia..." maxLength={80} />
          </div>
        </label>
        <label>
          <span className="mb-1 block text-sm text-slate-400">Categoria</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Tudo</option>
            <option value="workouts">Treinos</option>
            <option value="measurements">Medidas</option>
            <option value="photos">Fotos</option>
          </select>
        </label>
      </section>

      {message && <p aria-live="polite" className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p>}
      {loading && <p className="text-slate-400">Carregando itens arquivados...</p>}
      {!loading && total === 0 && <EmptyState title="Nenhum item encontrado" description="Ajuste a busca ou os filtros para localizar itens arquivados." icon={Archive} />}

      {!loading && filteredSections.map((section) => (
        section.items.length > 0 && (
          <section key={section.key} className="mb-5">
            <h2 className="mb-3 text-xl font-black">{section.title} <span className="text-sm font-medium text-slate-500">({section.items.length})</span></h2>
            <div className="grid gap-3">
              {section.items.map((item) => (
                <article key={item.id} className="card flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black">{itemTitle(section, item)}</h3>
                    <p className="text-sm text-slate-400">Data: {item.date}</p>
                  </div>
                  <button
                    type="button"
                    disabled={restoring === item.id}
                    onClick={() => restore(section.table, item)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RotateCcw size={17} /> {restoring === item.id ? 'Restaurando...' : 'Restaurar'}
                  </button>
                </article>
              ))}
            </div>
          </section>
        )
      ))}
    </div>
  )
}
