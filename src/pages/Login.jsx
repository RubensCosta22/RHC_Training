import { Activity, ArrowRight, KeyRound, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { logger, createRequestId } from '../lib/observability/logger'
import { friendlyError, normalizeEmail, validateNewPassword } from '../utils/validation'
import { getPostLoginPath } from '../services/accessService'

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

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        logger.warn('auth.session_lookup_failed', { requestId: createRequestId(), error })
        return
      }
      if (data.session) navigate(await getPostLoginPath(), { replace: true })
    })
  }, [location.state, navigate])

  async function handleGoogle() {
    const requestId = createRequestId()
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` }
    })

    if (error) {
      logger.warn('auth.oauth_start_failed', { requestId, provider: 'google', error })
      setMessage(friendlyError(error))
    } else {
      logger.info('auth.oauth_started', { requestId, provider: 'google' })
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const requestId = createRequestId()
    setLoading(true)
    setMessage('')

    try {
      const cleanEmail = normalizeEmail(email)
      if (mode === 'signup') validateNewPassword(password, password)

      const action = mode === 'login'
        ? supabase.auth.signInWithPassword({ email: cleanEmail, password })
        : supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: { emailRedirectTo: `${window.location.origin}/login` }
          })

      const { data, error } = await action
      if (error) throw error

      logger.info(mode === 'login' ? 'auth.login_succeeded' : 'auth.signup_succeeded', {
        requestId,
        userId: data?.user?.id || undefined,
        provider: 'password'
      })

      if (mode === 'login') navigate(await getPostLoginPath(), { replace: true })
      else setMessage('Cadastro criado. Confirme seu e-mail se o Supabase solicitar.')
    } catch (error) {
      logger.warn(mode === 'login' ? 'auth.login_failed' : 'auth.signup_failed', { requestId, provider: 'password', error })
      setMessage(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset() {
    const requestId = createRequestId()
    setMessage('')
    if (!email) {
      setMessage('Informe seu e-mail para receber o link de recuperacao.')
      return
    }

    setLoading(true)
    try {
      const cleanEmail = normalizeEmail(email)
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      logger.info('auth.password_reset_requested', { requestId })
      setMessage('Se o e-mail estiver cadastrado, voce recebera um link temporario para criar uma nova senha.')
    } catch (error) {
      logger.warn('auth.password_reset_failed', { requestId, error })
      setMessage(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[#08090a] lg:grid-cols-[minmax(0,1.45fr)_minmax(420px,.55fr)]">
      <section className="relative min-h-[46vh] overflow-hidden lg:min-h-screen">
        <img src="/assets/rhc-login-training.webp" alt="Atleta treinando com cordas em uma academia" className="absolute inset-0 h-full w-full object-cover object-[62%_center]" fetchPriority="high"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-black/25 lg:bg-gradient-to-r lg:from-black/50 lg:via-transparent lg:to-black/25"/>
        <div className="relative flex min-h-[46vh] flex-col justify-between p-6 sm:p-10 lg:min-h-screen lg:p-12 xl:p-16">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#c8ff3d] text-[#111400]"><Activity size={19} strokeWidth={2.8}/></span><span className="text-sm font-extrabold tracking-[-.03em] text-white">RHC / TRAINING</span></div>
          <div className="max-w-2xl"><p className="mb-4 text-[11px] font-bold uppercase tracking-[.16em] text-[#c8ff3d]">Consistencia muda tudo</p><h1 className="text-[clamp(3rem,6vw,6.5rem)] font-[780] leading-[.88] tracking-[-.075em] text-white">Treine.<br/>Evolua.<br/>Repita.</h1><p className="mt-5 hidden max-w-md text-base text-white/65 sm:block">Sua rotina, seu historico e sua evolucao em um unico lugar.</p></div>
        </div>
      </section>

      <section className="flex items-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16"><div className="mx-auto w-full max-w-md">
        <div className="mb-8"><p className="rhc-kicker mb-3">Sua conta</p><h2 className="text-3xl font-[720] tracking-[-.04em]">{mode==='login'?'Bem-vindo de volta.':'Comece sua jornada.'}</h2><p className="mt-2 text-sm text-[#92979f]">Entre para continuar seu proximo treino.</p></div>
        <button onClick={handleGoogle} className="btn-primary flex w-full items-center justify-center gap-2" type="button"><Mail size={18} />Entrar com Google</button>
        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[.16em] text-[#62676f]"><span className="h-px flex-1 bg-[#272a2f]" />ou<span className="h-px flex-1 bg-[#272a2f]" /></div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-[#92979f]">E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} placeholder="voce@exemplo.com" autoComplete="email" /></label>
          <label className="block text-xs font-semibold text-[#92979f]">Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === 'signup' ? 8 : 6} maxLength={128} placeholder="Sua senha" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          <button disabled={loading} className="btn-secondary flex w-full items-center justify-center gap-2" type="submit">{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar com e-mail' : 'Criar conta'} {!loading&&<ArrowRight size={17}/>}</button>
        </form>
        {mode === 'login' && <button className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-semibold text-[#92979f] hover:text-[#f5f7f2]" onClick={handlePasswordReset} disabled={loading} type="button"><KeyRound size={16} /> Esqueci minha senha</button>}
        <button className="mt-5 w-full text-sm font-semibold text-[#c8ff3d]" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} type="button">{mode === 'login' ? 'Ainda não tem conta? Criar conta' : 'Já tenho conta'}</button>
        {message && <p className="mt-5 border-l-2 border-[#ffb55e] bg-[#ffb55e]/5 p-3 text-sm text-[#ffd2a0]">{message}</p>}
      </div></section>
    </main>
  )
}
