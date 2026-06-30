import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listMeasurements, saveMeasurement } from '../services/measurementService'
import { friendlyError } from '../utils/validation'

const blank = {
  date: new Date().toISOString().slice(0, 10),
  weight: '', waist: '', chest: '', arm: '', thigh: '', hip: '', notes: ''
}

export default function Measurements() {
  const { profileId } = useParams()
  const [form, setForm] = useState(blank)
  const [items, setItems] = useState([])
  const [message, setMessage] = useState('')

  function load() {
    listMeasurements(profileId).then(setItems).catch((err) => setMessage(friendlyError(err)))
  }

  useEffect(() => { load() }, [profileId])

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    try {
      await saveMeasurement(profileId, form)
      setForm(blank)
      load()
      setMessage('Medidas salvas.')
    } catch (error) {
      setMessage(friendlyError(error))
    }
  }

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm font-bold text-emerald-300">Medidas</p>
        <h1 className="text-3xl font-black">Corpo e peso</h1>
      </header>

      <form onSubmit={submit} className="card mb-5 grid gap-3 md:grid-cols-3">
        <label><span className="mb-1 block text-sm text-slate-400">Data</span><input type="date" value={form.date} onChange={(e) => change('date', e.target.value)} /></label>
        <label><span className="mb-1 block text-sm text-slate-400">Peso kg</span><input type="number" min="0" step="0.1" value={form.weight} onChange={(e) => change('weight', e.target.value)} /></label>
        <label><span className="mb-1 block text-sm text-slate-400">Cintura cm</span><input type="number" min="0" step="0.1" value={form.waist} onChange={(e) => change('waist', e.target.value)} /></label>
        <label><span className="mb-1 block text-sm text-slate-400">Peito cm</span><input type="number" min="0" step="0.1" value={form.chest} onChange={(e) => change('chest', e.target.value)} /></label>
        <label><span className="mb-1 block text-sm text-slate-400">Braço cm</span><input type="number" min="0" step="0.1" value={form.arm} onChange={(e) => change('arm', e.target.value)} /></label>
        <label><span className="mb-1 block text-sm text-slate-400">Coxa cm</span><input type="number" min="0" step="0.1" value={form.thigh} onChange={(e) => change('thigh', e.target.value)} /></label>
        <label><span className="mb-1 block text-sm text-slate-400">Quadril cm</span><input type="number" min="0" step="0.1" value={form.hip} onChange={(e) => change('hip', e.target.value)} /></label>
        <label className="md:col-span-2"><span className="mb-1 block text-sm text-slate-400">Observações</span><input maxLength={500} value={form.notes} onChange={(e) => change('notes', e.target.value)} /></label>
        <button className="btn-primary md:col-span-3 flex items-center justify-center gap-2"><Save size={18} /> Salvar medidas</button>
      </form>

      {message && <p className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p>}

      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="card text-sm">
            <h2 className="font-black">{item.date}</h2>
            <p className="mt-2 text-slate-300">Peso: {item.weight ?? '-'} kg • Cintura: {item.waist ?? '-'} cm • Peito: {item.chest ?? '-'} cm</p>
            <p className="text-slate-400">Braço: {item.arm ?? '-'} cm • Coxa: {item.thigh ?? '-'} cm • Quadril: {item.hip ?? '-'} cm</p>
            {item.notes && <p className="mt-2 text-slate-500">{item.notes}</p>}
          </article>
        ))}
      </div>
    </div>
  )
}
