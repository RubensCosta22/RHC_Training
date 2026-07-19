import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { getFamilyContext, listProfileAssociations } from '../services/familyService'
import { listPlansForAdmin, savePlan } from '../services/planService'
import { friendlyError } from '../utils/validation'

const emptyExercise = () => ({ id: crypto.randomUUID(), name: '', muscleGroup: '', sets: 3, reps: '8-12', rest: 60, goal: '', alternatives: [], active: true })

export default function Plans() {
  const [profiles, setProfiles] = useState([])
  const [profile, setProfile] = useState(null)
  const [plans, setPlans] = useState([])
  const [selectedType, setSelectedType] = useState('A')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getFamilyContext().then(async (context) => {
      if (context?.role !== 'admin') throw new Error('Apenas o administrador pode editar planos.')
      const items = await listProfileAssociations()
      setProfiles(items)
      setProfile(items[0] || null)
    }).catch((error) => setMessage(friendlyError(error)))
  }, [])

  useEffect(() => {
    if (!profile) return
    listPlansForAdmin(profile).then(setPlans).catch((error) => setMessage(friendlyError(error)))
  }, [profile])

  const plan = plans.find((item) => item.workout_type === selectedType)
  function patchPlan(patch) { setPlans((items) => items.map((item) => item.workout_type === selectedType ? { ...item, ...patch } : item)) }
  function patchExercise(index, patch) { patchPlan({ exercises: plan.exercises.map((item, position) => position === index ? { ...item, ...patch } : item) }) }
  function move(index, direction) { const next=[...plan.exercises]; const target=index+direction; if(target<0||target>=next.length)return; [next[index],next[target]]=[next[target],next[index]]; patchPlan({exercises:next}) }

  async function save() {
    setSaving(true); setMessage('')
    try { const saved=await savePlan(profile.id, plan); setPlans((items)=>items.map((item)=>item.workout_type===selectedType?saved:item)); setMessage('Plano salvo. A mudanca vale para os proximos treinos.') }
    catch(error){ setMessage(friendlyError(error)) } finally { setSaving(false) }
  }

  return <div>
    <PageHeader eyebrow="Administracao" title="Planos de treino" subtitle="Edite os proximos treinos sem alterar o historico concluido." />
    <section className="card mb-4">
      <label className="text-sm text-slate-300">Perfil
        <select className="mt-1" value={profile?.id || ''} onChange={(event)=>setProfile(profiles.find((item)=>item.id===event.target.value))}>{profiles.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </label>
      <div className="mt-3 grid grid-cols-5 gap-2">{['A','B','C','D','E'].map((type)=><button type="button" key={type} onClick={()=>setSelectedType(type)} className={type===selectedType?'btn-primary':'btn-secondary'}>{type}</button>)}</div>
    </section>
    {plan && <>
      <section className="card mb-4 space-y-3">
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
