import { Activity, ArrowRight, KeyRound, Mail } from 'lucide-react'
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
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-14 px-6 py-12 lg:grid-cols-[1.2fr_.8fr] lg:px-10">
      <section className="max-w-2xl">
        <div className="mb-16 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#c8ff3d] text-[#111400]"><Activity size={19} strokeWidth={2.8}/></span><span className="text-sm font-extrabold tracking-[-.03em]">RHC / TRAINING</span></div>
        <p className="rhc-kicker mb-5">Consistencia muda tudo</p>
        <h1 className="text-[clamp(3.5rem,9vw,7.5rem)] font-[780] leading-[.86] tracking-[-.075em]">Treine.<br/><span className="text-[#62676f]">Evolua.</span><br/>Repita.</h1>
        <p className="mt-8 max-w-md text-lg leading-relaxed text-[#92979f]">Uma experiencia de treino pessoal, precisa e sempre sincronizada.</p>
      </section>

      <section className="border-t border-[#272a2f] pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
        <div className="mb-8"><p className="rhc-kicker mb-3">Sua conta</p><h2 className="text-3xl font-[720] tracking-[-.04em]">{mode==='login'?'Bem-vindo de volta.':'Comece sua jornada.'}</h2></div>
        <button
          onClick={handleGoogle}
          className="btn-primary flex w-full items-center justify-center gap-2"
          type="button"
        >
          <Mail size={18} />
          Entrar com Google
        </button>

        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[.16em] text-[#62676f]">
          <span className="h-px flex-1 bg-[#272a2f]" />
          ou
          <span className="h-px flex-1 bg-[#272a2f]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-[#92979f]">E-mail<input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="voce@exemplo.com"
            autoComplete="email"
          /></label>

          <label className="block text-xs font-semibold text-[#92979f]">Senha<input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            placeholder="Sua senha"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          /></label>

          <button disabled={loading} className="btn-secondary flex w-full items-center justify-center gap-2" type="submit">
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar com e-mail' : 'Criar conta'} {!loading&&<ArrowRight size={17}/>}
          </button>
        </form>

        {mode === 'login' && (
          <button
            className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-semibold text-[#92979f] hover:text-[#f5f7f2]"
            onClick={handlePasswordReset}
            disabled={loading}
            type="button"
          >
            <KeyRound size={16} /> Esqueci minha senha
          </button>
        )}

        <button
          className="mt-5 w-full text-sm font-semibold text-[#c8ff3d]"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          type="button"
        >
          {mode === 'login' ? 'Ainda não tem conta? Criar conta' : 'Já tenho conta'}
        </button>

        {message && (
          <p className="mt-5 border-l-2 border-[#ffb55e] bg-[#ffb55e]/5 p-3 text-sm text-[#ffd2a0]">
            {message}
          </p>
        )}
      </section>
    </main>
  )
}
