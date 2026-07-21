import { ArrowDown, ArrowUp, CheckCircle2, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { getFamilyContext, listProfileAssociations } from '../services/familyService'
import { listPlansForAdmin, savePlan } from '../services/planService'
import { applyProgramToProfile, getProfileProgramState, listPublishedPrograms } from '../services/programAdminService'
import { friendlyError } from '../utils/validation'
import { applyRequestedPlan } from '../services/scheduleService'

const emptyExercise = () => ({ id: crypto.randomUUID(), name: '', muscleGroup: '', sets: 3, reps: '8-12', rest: 60, goal: '', alternatives: [], active: true })

export default function Plans() {
  const [profiles, setProfiles] = useState([])
  const [profile, setProfile] = useState(null)
  const [plans, setPlans] = useState([])
  const [programs, setPrograms] = useState([])
  const [programState, setProgramState] = useState(null)
  const [selectedType, setSelectedType] = useState('A')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    getFamilyContext().then(async (context) => {
      if (context?.role !== 'admin') throw new Error('Apenas o administrador pode editar planos.')
      const [items, publishedPrograms] = await Promise.all([listProfileAssociations(), listPublishedPrograms()])
      setProfiles(items)
      setPrograms(publishedPrograms)
      setProfile(items[0] || null)
    }).catch((error) => setMessage(friendlyError(error)))
  }, [])

  useEffect(() => {
    if (!profile) return
    Promise.all([listPlansForAdmin(profile), getProfileProgramState(profile.id)])
      .then(([profilePlans, activeProgram]) => {
        setPlans(profilePlans)
        setProgramState(activeProgram)
      })
      .catch((error) => setMessage(friendlyError(error)))
  }, [profile])

  const plan = plans.find((item) => item.workout_type === selectedType)
  const strengthProgram = programs.find((item) => item.slug === 'rhc-strength-12w')
  const isStrengthActive = programState?.training_programs?.slug === 'rhc-strength-12w'
  const isHenrique = String(profile?.name || '').trim().toLowerCase() === 'henrique'

  function patchPlan(patch) { setPlans((items) => items.map((item) => item.workout_type === selectedType ? { ...item, ...patch } : item)) }
  function patchExercise(index, patch) { patchPlan({ exercises: plan.exercises.map((item, position) => position === index ? { ...item, ...patch } : item) }) }
  function move(index, direction) { const next=[...plan.exercises]; const target=index+direction; if(target<0||target>=next.length)return; [next[index],next[target]]=[next[target],next[index]]; patchPlan({exercises:next}) }

  async function save() {
    setSaving(true); setMessage('')
    try { const saved=await savePlan(profile.id, plan); setPlans((items)=>items.map((item)=>item.workout_type===selectedType?saved:item)); setMessage('Plano salvo. A mudanca vale para os proximos treinos.') }
    catch(error){ setMessage(friendlyError(error)) } finally { setSaving(false) }
  }

  async function applyPreset(){setSaving(true);setMessage('');try{await applyRequestedPlan(profile);setPlans(await listPlansForAdmin(profile));setMessage('Cronograma semanal aplicado.')}catch(error){setMessage(friendlyError(error))}finally{setSaving(false)}}

  async function publishStrengthProgram() {
    if (!profile || !strengthProgram) return
    const confirmed = window.confirm(`Aplicar ${strengthProgram.name} ao perfil ${profile.name}? O ciclo anterior sera preservado no historico.`)
    if (!confirmed) return

    setPublishing(true)
    setMessage('')
    try {
      await applyProgramToProfile(profile.id, strengthProgram.slug)
      const activeProgram = await getProfileProgramState(profile.id)
      setProgramState(activeProgram)
      setMessage(`${strengthProgram.name} aplicado a ${profile.name}. O usuario ja pode atualizar o app para usar o novo programa.`)
    } catch (error) {
      setMessage(friendlyError(error))
    } finally {
      setPublishing(false)
    }
  }

  return <div>
    <PageHeader eyebrow="Administracao" title="Planos de treino" subtitle="Edite ou publique os proximos treinos sem alterar o historico concluido." />
    <section className="card mb-4">
      <label className="text-sm text-slate-300">Perfil
        <select className="mt-1" value={profile?.id || ''} onChange={(event)=>setProfile(profiles.find((item)=>item.id===event.target.value))}>{profiles.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </label>
      <div className="mt-3 grid grid-cols-5 gap-2">{['A','B','C','D','E'].map((type)=><button type="button" key={type} onClick={()=>setSelectedType(type)} className={type===selectedType?'btn-primary':'btn-secondary'}>{type}</button>)}</div>
    </section>

    {isHenrique && strengthProgram && <section className="card mb-4 border border-[#c8ff3d]/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="rhc-kicker mb-2">Programa estruturado</p>
          <h2 className="text-xl font-bold">{strengthProgram.name}</h2>
          <p className="mt-1 text-sm text-[#92979f]">{strengthProgram.duration_weeks} semanas · força · progressao por RPE</p>
          {isStrengthActive && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#c8ff3d]"><CheckCircle2 size={17}/> Ativo desde {programState.start_date} · semana {programState.current_week}</p>}
        </div>
        <button className="btn-primary min-w-[190px]" type="button" disabled={publishing} onClick={publishStrengthProgram}>
          {publishing ? 'Aplicando...' : isStrengthActive ? 'Reaplicar programa' : 'Aplicar programa'}
        </button>
      </div>
      <p className="mt-4 border-t border-[#272a2f] pt-4 text-xs text-[#62676f]">A publicacao preserva sessoes, cargas, recordes, medidas e fotos do ciclo anterior.</p>
    </section>}

    {plan && <>
      <section className="card mb-4 space-y-3">
        {['Karol','Rudney'].includes(profile?.name)&&<button className="btn-secondary w-full" type="button" onClick={applyPreset}>Aplicar cronograma semanal de {profile.name}</button>}
        {isHenrique && strengthProgram && <button className="btn-secondary w-full" type="button" disabled={publishing} onClick={publishStrengthProgram}>{publishing?'Aplicando RHC Strength 12W...':`${isStrengthActive?'Reaplicar':'Aplicar'} RHC Strength 12W ao Henrique`}</button>}
        <label className="text-sm text-slate-300">Titulo<input value={plan.title} onChange={(event)=>patchPlan({title:event.target.value})}/></label>
        <label className="text-sm text-slate-300">Descricao<textarea value={plan.description || ''} onChange={(event)=>patchPlan({description:event.target.value})}/></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={plan.active!==false} onChange={(event)=>patchPlan({active:event.target.checked})}/> Plano ativo</label>
      </section>
      {plan.exercises.map((exercise,index)=><section className="card mb-3" key={exercise.id || index}>
        <div className="mb-3 flex items-center justify-between"><strong>Exercicio {index+1}</strong><div className="flex gap-2"><button onClick={()=>move(index,-1)} aria-label="Mover para cima"><ArrowUp size={18}/></button><button onClick={()=>move(index,1)} aria-label="Mover para baixo"><ArrowDown size={18}/></button><button onClick={()=>patchPlan({exercises:plan.exercises.filter((_,position)=>position!==index)})} aria-label="Remover"><Trash2 size={18}/></button></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Nome<input value={exercise.name} onChange={(event)=>patchExercise(index,{name:event.target.value})}/></label>
          <label className="text-sm">Grupo muscular<input value={exercise.muscleGroup || ''} onChange={(event)=>patchExercise(index,{muscleGroup:event.target.value})}/></label>
          <label className="text-sm">Series<input type="number" min="1" max="20" value={exercise.sets} onChange={(event)=>patchExercise(index,{sets:event.target.value})}/></label>
          <label className="text-sm">Repeticoes<input value={exercise.reps} onChange={(event)=>patchExercise(index,{reps:event.target.value})}/></label>
          <label className="text-sm">Descanso (segundos)<input type="number" min="0" max="600" value={exercise.rest || 0} onChange={(event)=>patchExercise(index,{rest:event.target.value})}/></label>
          <label className="text-sm">Alternativas (separadas por virgula)<input value={(exercise.alternatives || []).join(', ')} onChange={(event)=>patchExercise(index,{alternatives:event.target.value.split(',').map((item)=>item.trim())})}/></label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={exercise.active!==false} onChange={(event)=>patchExercise(index,{active:event.target.checked})}/> Exercicio ativo</label>
      </section>)}
      <button className="btn-secondary mb-3 flex w-full items-center justify-center gap-2" onClick={()=>patchPlan({exercises:[...plan.exercises,emptyExercise()]})}><Plus size={18}/> Adicionar exercicio</button>
      <button className="btn-primary flex w-full items-center justify-center gap-2" disabled={saving} onClick={save}><Save size={18}/>{saving?'Salvando...':'Salvar plano'}</button>
    </>}
    {message && <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm">{message}</p>}
  </div>
}
