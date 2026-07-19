import { Dumbbell, KeyRound, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { friendlyError } from '../utils/validation'
import { getPostLoginPath } from '../services/familyService'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (location.state?.passwordUpdated) {
      setMessage('Senha atualizada. Entre com sua nova senha.')
      navigate('/login', { replace: true, state: null })
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) navigate(await getPostLoginPath(), { replace: true })
    })
  }, [location.state, navigate])

  async function handleGoogle() {
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/profiles` }
    })

    if (error) setMessage(friendlyError(error))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const action =
        mode === 'login'
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/profiles` }
            })

      const { error } = await action

      if (error) throw error

      if (mode === 'login') {
        navigate(await getPostLoginPath())
      } else {
        setMessage('Cadastro criado. Confirme seu e-mail se o Supabase solicitar.')
      }
    } catch (error) {
      setMessage(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset() {
    setMessage('')
    if (!email) {
      setMessage('Informe seu e-mail para receber o link de recuperacao.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error

      setMessage('Se o e-mail estiver cadastrado, voce recebera um link temporario para criar uma nova senha.')
    } catch (error) {
      setMessage(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-[2rem] bg-emerald-400 text-slate-950 shadow-glow">
          <Dumbbell size={38} />
        </div>

        <h1 className="text-3xl font-black">RHC Training</h1>

        <p className="mx-auto mt-2 max-w-xs text-slate-400">
          Seu treino, histórico e evolução sempre sincronizados.
        </p>
      </div>

      <section className="card">
        <button
          onClick={handleGoogle}
          className="btn-primary flex w-full items-center justify-center gap-2"
          type="button"
        >
          <Mail size={18} />
          Entrar com Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          ou
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="E-mail"
            autoComplete="email"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            placeholder="Senha"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          <button disabled={loading} className="btn-secondary w-full" type="submit">
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar com e-mail' : 'Criar conta'}
          </button>
        </form>

        {mode === 'login' && (
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-300 hover:text-emerald-300"
            onClick={handlePasswordReset}
            disabled={loading}
            type="button"
          >
            <KeyRound size={16} /> Esqueci minha senha
          </button>
        )}

        <button
          className="mt-4 w-full text-sm font-semibold text-emerald-300"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          type="button"
        >
          {mode === 'login' ? 'Ainda não tem conta? Criar conta' : 'Já tenho conta'}
        </button>

        {message && (
          <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
            {message}
          </p>
        )}
      </section>
    </main>
  )
}
