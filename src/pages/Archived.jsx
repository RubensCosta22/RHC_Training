import { Archive, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
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

  const total = sections.reduce((sum, section) => sum + items[section.key].length, 0)

  return (
    <div>
      <PageHeader
        eyebrow="Seguranca dos dados"
        title="Arquivados"
        subtitle="Restaure itens sem perder o historico."
      />

      {message && <p aria-live="polite" className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p>}
      {loading && <p className="text-slate-400">Carregando itens arquivados...</p>}
      {!loading && total === 0 && <EmptyState title="Nenhum item arquivado" description="Treinos, medidas e fotos arquivados aparecerao aqui." icon={Archive} />}

      {!loading && sections.map((section) => (
        items[section.key].length > 0 && (
          <section key={section.key} className="mb-5">
            <h2 className="mb-3 text-xl font-black">{section.title}</h2>
            <div className="grid gap-3">
              {items[section.key].map((item) => (
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
