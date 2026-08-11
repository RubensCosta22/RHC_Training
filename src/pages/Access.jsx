import { ShieldCheck, UserRoundCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { associateProfileEmail, getAccessContext, listProfileAssociations } from '../services/accessService'
import { friendlyError } from '../utils/validation'

export default function Access() {
  const [context, setContext] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [emails, setEmails] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function load() {
    const current = await getAccessContext()
    setContext(current)
    setProfiles(current?.role === 'admin' ? await listProfileAssociations() : [])
  }

  useEffect(() => {
    load().catch((error) => setMessage(friendlyError(error))).finally(() => setLoading(false))
  }, [])

  async function associate(profile) {
    setMessage('')
    try {
      await associateProfileEmail(profile.id, emails[profile.id] ?? profile.invitation_email ?? '')
      await load()
      setMessage(`${profile.name}: convite salvo. O vinculo 1:1 sera ativado quando o titular entrar com esse e-mail.`)
    } catch (error) { setMessage(friendlyError(error)) }
  }

  return (
    <div>
      <PageHeader eyebrow="Administracao" title="Pessoas e acesso" subtitle="Cada usuario comum pode acessar exatamente um perfil. Administradores acessam todos." />
      {loading && <section className="card">Carregando...</section>}

      {!loading && !context && (
        <section className="card text-center">
          <p className="text-sm text-slate-300">Esta conta ainda nao esta registrada no RHC Training V2.</p>
        </section>
      )}

      {!loading && context && context.role !== 'admin' && (
        <section className="card flex gap-3"><UserRoundCheck className="text-emerald-300" /><p>Conta vinculada. Voce acessa somente o seu perfil.</p></section>
      )}

      {context?.role === 'admin' && profiles.map((profile) => {
        const invitation = profile.invitation
        const status = invitation?.status === 'claimed'
          ? `Acesso ativo${invitation.claimed_at ? ` desde ${new Date(invitation.claimed_at).toLocaleDateString('pt-BR')}` : ''}`
          : invitation?.status === 'pending'
            ? 'Aguardando primeiro acesso'
            : 'Sem convite ativo'

        return (
          <section className="card mb-4" key={profile.id}>
            <div className="mb-3 flex items-center gap-2"><ShieldCheck className="text-emerald-300" /><h2 className="font-black">{profile.name}</h2></div>
            <label className="text-sm text-slate-300">E-mail do titular
              <input className="mt-1" type="email" value={emails[profile.id] ?? profile.invitation_email ?? ''} onChange={(event) => setEmails((value) => ({ ...value, [profile.id]: event.target.value }))} />
            </label>
            <button className="btn-secondary mt-3 w-full" onClick={() => associate(profile)}>{invitation?.status === 'pending' ? 'Atualizar convite' : 'Criar novo convite'}</button>
            <p className="mt-2 text-xs text-slate-400">{status}</p>
          </section>
        )
      })}

      {context?.role === 'admin' && <Link to="/plans" className="btn-primary mt-4 flex w-full items-center justify-center">Planos de treino</Link>}
      {message && <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm">{message}</p>}
    </div>
  )
}
