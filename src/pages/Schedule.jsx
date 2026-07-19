import { CalendarDays, Check, Copy, Dumbbell, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { getFamilyContext, listProfileAssociations } from '../services/familyService'
import { listWeeklySchedules, saveWeeklySchedule } from '../services/scheduleService'
import { friendlyError } from '../utils/validation'

const days = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']
const options = [null, 'A', 'B', 'C', 'D', 'E']
const emptyWeek = () => Array(7).fill(null)

export default function Schedule() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [schedules, setSchedules] = useState({})
  const [selectedId, setSelectedId] = useState('')
  const [copyTarget, setCopyTarget] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getFamilyContext().then(async (context) => {
      if (context?.role !== 'admin') { navigate('/profiles', { replace: true }); return }
      const items = await listProfileAssociations()
      const loaded = await listWeeklySchedules(items.map((profile) => profile.id))
      setProfiles(items)
      setSchedules(loaded)
      setSelectedId(items[0]?.id || '')
      setCopyTarget(items[1]?.id || '')
    }).catch((error) => setMessage(friendlyError(error))).finally(() => setLoading(false))
  }, [navigate])

  const selected = profiles.find((profile) => profile.id === selectedId)
  const week = schedules[selectedId] || emptyWeek()
  const trainingDays = useMemo(() => week.filter(Boolean).length, [week])

  function selectProfile(profileId) {
    setSelectedId(profileId); setDirty(false); setMessage('')
    if (copyTarget === profileId) setCopyTarget(profiles.find((profile) => profile.id !== profileId)?.id || '')
  }

  function updateDay(day, workoutType) {
    setSchedules((current) => ({ ...current, [selectedId]: week.map((value, index) => index === day ? workoutType : value) }))
    setDirty(true); setMessage('')
  }

  async function save() {
    setSaving(true); setMessage('')
    try { await saveWeeklySchedule(selectedId, week); setDirty(false); setMessage(`Agenda de ${selected.name} salva. Os treinos concluidos foram preservados.`) }
    catch (error) { setMessage(friendlyError(error)) } finally { setSaving(false) }
  }

  async function copyWeek() {
    if (!copyTarget || copyTarget === selectedId) return
    const target = profiles.find((profile) => profile.id === copyTarget)
    setSaving(true); setMessage('')
    try {
      await saveWeeklySchedule(copyTarget, week)
      setSchedules((current) => ({ ...current, [copyTarget]: [...week] }))
      setMessage(`Agenda de ${selected.name} copiada para ${target.name}.`)
    } catch (error) { setMessage(friendlyError(error)) } finally { setSaving(false) }
  }

  return <div>
    <PageHeader eyebrow="Administracao" title="Agenda semanal" subtitle="Organize os proximos treinos sem alterar o historico realizado." />

    <section className="card-glow mb-4">
      <label className="text-sm text-slate-300">Perfil
        <select className="mt-1" value={selectedId} onChange={(event)=>selectProfile(event.target.value)}>{profiles.map((profile)=><option value={profile.id} key={profile.id}>{profile.name}</option>)}</select>
      </label>
      {selected && <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/50 p-4"><div><strong className="text-lg">Semana de {selected.name}</strong><p className="text-sm text-slate-400">{trainingDays} dias de treino · {7-trainingDays} de descanso</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><CalendarDays/></span></div>}
    </section>

    {loading && <section className="card">Carregando agendas...</section>}
    {!loading && selected && <div className="mb-4 space-y-3">{days.map((day,index)=><section className="card flex flex-col gap-3 sm:flex-row sm:items-center" key={day}>
      <div className="min-w-0 flex-1"><p className="font-bold">{day}</p><p className="text-xs text-slate-400">{week[index]?`Treino ${week[index]}`:'Recuperacao e descanso'}</p></div>
      <div className="grid w-full grid-cols-6 gap-1.5 sm:w-auto" role="group" aria-label={`Treino de ${day}`}>{options.map((option)=><button type="button" key={option || 'rest'} onClick={()=>updateDay(index,option)} aria-label={option?`Treino ${option}`:'Descanso'} className={`grid h-10 min-w-0 place-items-center rounded-xl border px-2 text-xs font-black transition ${week[index]===option?'border-emerald-300 bg-emerald-300 text-slate-950':'border-slate-700 bg-slate-900 text-slate-400 hover:border-emerald-400/50'}`}>{option || '—'}</button>)}</div>
    </section>)}</div>}

    {selected && <button className="btn-primary mb-5 flex w-full items-center justify-center gap-2" disabled={saving || !dirty} onClick={save}>{dirty?<Save size={18}/>:<Check size={18}/>} {saving?'Salvando...':dirty?'Salvar agenda':'Agenda salva'}</button>}

    {profiles.length > 1 && selected && <section className="card mb-4"><div className="mb-3 flex items-center gap-3"><Copy className="text-sky-300"/><div><h2 className="font-black">Copiar esta semana</h2><p className="text-sm text-slate-400">Use a mesma distribuicao em outro perfil.</p></div></div><div className="flex gap-2"><select value={copyTarget} onChange={(event)=>setCopyTarget(event.target.value)}>{profiles.filter((profile)=>profile.id!==selectedId).map((profile)=><option value={profile.id} key={profile.id}>{profile.name}</option>)}</select><button className="btn-secondary shrink-0" disabled={saving || !copyTarget} onClick={copyWeek}>Copiar</button></div></section>}

    {message && <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p>}
    {!loading && !profiles.length && <section className="card text-center"><Dumbbell className="mx-auto mb-2 text-slate-400"/><p>Nenhum perfil associado.</p></section>}
  </div>
}
