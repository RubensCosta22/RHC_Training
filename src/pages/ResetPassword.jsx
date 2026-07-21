import { KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { secureSignOut } from '../services/authService'
import { friendlyError, validateNewPassword } from '../utils/validation'
import { clearPasswordRecovery, hasPasswordRecovery } from '../utils/authRecovery'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [checking, setChecking] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session) && hasPasswordRecovery(data.session))
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setHasRecoverySession(Boolean(session) && (event === 'PASSWORD_RECOVERY' || hasPasswordRecovery(session)))
      setChecking(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const cleanPassword = validateNewPassword(password, confirmation)
      const { error } = await supabase.auth.updateUser({ password: cleanPassword })
      if (error) throw error

      clearPasswordRecovery()
      await secureSignOut()
      navigate('/login', {
        replace: true,
        state: { passwordUpdated: true }
      })
    } catch (error) {
      setMessage(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return <main className="grid min-h-screen place-items-center text-slate-300">Validando link...</main>
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <section className="card">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-emerald-400/15 text-emerald-300">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-black">Criar nova senha</h1>
          <p className="mt-2 text-sm text-slate-400">Use pelo menos 8 caracteres, com letra maiuscula, minuscula e numero.</p>
        </div>

        {!hasRecoverySession ? (
          <div className="text-center">
            <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
              Este link e invalido ou expirou. Solicite um novo link de recuperacao.
            </p>
            <Link to="/login" className="btn-secondary mt-4 inline-flex">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label>
              <span className="mb-1 block text-sm text-slate-300">Nova senha</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
            <label>
              <span className="mb-1 block text-sm text-slate-300">Confirmar nova senha</span>
              <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        )}

        {message && <p aria-live="polite" className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{message}</p>}
      </section>
    </main>
  )
}
