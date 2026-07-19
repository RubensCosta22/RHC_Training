import { ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { associateProfileEmail, createFamilyGroup, getFamilyContext, listProfileAssociations } from '../services/familyService'
import { friendlyError } from '../utils/validation'

export default function Family() {
  const [context, setContext] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [emails, setEmails] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function load() {
    const family = await getFamilyContext()
    setContext(family)
    setProfiles(family?.role === 'admin' ? await listProfileAssociations() : [])
  }

  useEffect(() => {
    load().catch((error) => setMessage(friendlyError(error))).finally(() => setLoading(false))
  }, [])

  async function createGroup() {
    setMessage('')
    try {
      await createFamilyGroup('Familia RHC')
      await load()
      setMessage('Grupo familiar criado. Agora associe cada perfil ao e-mail correto.')
    } catch (error) { setMessage(friendlyError(error)) }
  }

  async function associate(profile) {
    setMessage('')
    try {
      await associateProfileEmail(profile.id, emails[profile.id] || '')
      await load()
      setMessage(`${profile.name} associado. O acesso sera ativado quando o usuario entrar.`)
    } catch (error) { setMessage(friendlyError(error)) }
  }

  return (
    <div>
      <PageHeader eyebrow="Administracao" title="Grupo familiar" subtitle="Cada titular acessa somente o proprio perfil. O administrador acessa todos." />
      {loading && <section className="card">Carregando...</section>}
      {!loading && !context && (
        <section className="card text-center">
          <UsersRound className="mx-auto mb-3 text-emerald-300" size={34} />
          <p className="mb-4 text-sm text-slate-300">Crie o grupo usando a conta administradora que possui os perfis atuais.</p>
          <button className="btn-primary w-full" onClick={createGroup}>Criar grupo familiar</button>
        </section>
      )}
      {!loading && context?.role !== 'admin' && (
        <section className="card flex gap-3"><UserRoundCheck className="text-emerald-300" /><p>Conta vinculada. Voce acessa somente o seu perfil.</p></section>
      )}
      {context?.role === 'admin' && profiles.map((profile) => (
        <section className="card mb-4" key={profile.id}>
          <div className="mb-3 flex items-center gap-2"><ShieldCheck className="text-emerald-300" /><h2 className="font-black">{profile.name}</h2></div>
          <label className="text-sm text-slate-300">E-mail do titular
            <input className="mt-1" type="email" value={emails[profile.id] ?? profile.invitation?.email ?? ''} onChange={(event) => setEmails((value) => ({ ...value, [profile.id]: event.target.value }))} />
          </label>
          <button className="btn-secondary mt-3 w-full" onClick={() => associate(profile)}>Associar perfil</button>
          {profile.invitation && <p className="mt-2 text-xs text-slate-400">{profile.invitation.accepted_at ? 'Acesso ativo' : 'Aguardando primeiro acesso'}</p>}
        </section>
      ))}
      {message && <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm">{message}</p>}
    </div>
  )
}
