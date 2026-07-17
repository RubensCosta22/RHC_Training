import { Archive, Camera, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { archivePhoto, listPhotos, uploadProgressPhoto } from '../services/photoService'
import { friendlyError } from '../utils/validation'
import { toLocalDateKey } from '../utils/date'

export default function Photos() {
  const { profileId } = useParams()
  const [photos, setPhotos] = useState([])
  const [date, setDate] = useState(toLocalDateKey())
  const [photoType, setPhotoType] = useState('frente')
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function load() {
    listPhotos(profileId).then(setPhotos).catch((err) => setMessage(friendlyError(err)))
  }

  useEffect(() => { load() }, [profileId])

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await uploadProgressPhoto({ profileId, date, photoType, file, notes })
      setFile(null)
      setNotes('')
      load()
      setMessage('Foto enviada com segurança. A visualização usa URL assinada temporária.')
    } catch (error) {
      setMessage(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  async function archiveItem(photo) {
    if (!window.confirm(`Arquivar esta foto de ${photo.date}? O arquivo nao sera apagado.`)) return

    setMessage('')
    try {
      await archivePhoto(photo.id)
      load()
      setMessage('Foto arquivada sem apagar o arquivo original.')
    } catch (error) {
      setMessage(friendlyError(error))
    }
  }

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm font-bold text-emerald-300">Fotos</p>
        <h1 className="text-3xl font-black">Evolução visual</h1>
      </header>

      <form onSubmit={submit} className="card mb-5 grid gap-3 md:grid-cols-3">
        <label><span className="mb-1 block text-sm text-slate-400">Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label><span className="mb-1 block text-sm text-slate-400">Tipo</span><select value={photoType} onChange={(e) => setPhotoType(e.target.value)}><option value="frente">Frente</option><option value="lado">Lado</option><option value="costas">Costas</option></select></label>
        <label><span className="mb-1 block text-sm text-slate-400">Imagem</span><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        <label className="md:col-span-3"><span className="mb-1 block text-sm text-slate-400">Observações</span><input maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <button disabled={loading} className="btn-primary md:col-span-3 flex items-center justify-center gap-2"><Upload size={18} /> {loading ? 'Enviando...' : 'Enviar foto'}</button>
      </form>

      {message && <p className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {photos.map((photo) => (
          <article key={photo.id} className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black capitalize">{photo.photo_type}</h2>
              <span className="badge">{photo.date}</span>
            </div>
            {photo.signedUrl ? (
              <img src={photo.signedUrl} alt={`Foto de evolução ${photo.photo_type}`} className="h-72 w-full rounded-2xl object-cover" />
            ) : (
              <div className="grid h-72 place-items-center rounded-2xl bg-slate-950 text-slate-500"><Camera size={32} /></div>
            )}
            {photo.notes && <p className="mt-3 text-sm text-slate-400">{photo.notes}</p>}
            <button type="button" onClick={() => archiveItem(photo)} className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-300">
              <Archive size={16} /> Arquivar foto
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
