import { Archive, Download, FileJson, LogOut, ShieldCheck, Upload, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { exportHistoryCsv, exportHistoryJson, importBackupJson } from '../services/backupService'
import { getPendingWorkouts } from '../utils/storage'
import { friendlyError } from '../utils/validation'
import PageHeader from '../components/ui/PageHeader'

export default function Settings() {
  const { profileId } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const pending = getPendingWorkouts().length

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  async function run(action) {
    setMessage('')
    try {
      await action()
      setMessage('Ação concluída.')
    } catch (error) {
      setMessage(friendlyError(error))
    }
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    await run(async () => importBackupJson(profileId, file))
  }

  return (
    <div>
      <PageHeader eyebrow="Configuracoes" title="Dados e seguranca" subtitle="Controle, protecao e portabilidade do seu historico." />

      <section className="card mb-4 space-y-3">
        <Link to="/family" className="btn-secondary flex w-full items-center justify-center gap-2">
          <UsersRound size={18} /> Grupo familiar
        </Link>
        <Link to={`/archived/${profileId}`} className="btn-secondary flex w-full items-center justify-center gap-2">
          <Archive size={18} /> Arquivados e restauracao
        </Link>
        <button onClick={() => run(() => exportHistoryCsv(profileId))} className="btn-secondary flex w-full items-center justify-center gap-2"><Download size={18} /> Exportar CSV</button>
        <button onClick={() => run(() => exportHistoryJson(profileId))} className="btn-secondary flex w-full items-center justify-center gap-2"><FileJson size={18} /> Exportar JSON</button>
        <label className="btn-secondary flex w-full cursor-pointer items-center justify-center gap-2">
          <Upload size={18} /> Importar JSON de backup
          <input type="file" accept="application/json" className="hidden" onChange={importFile} />
        </label>
      </section>

      <section className="card mb-4 flex gap-3 text-sm text-slate-300">
        <ShieldCheck className="shrink-0 text-lime-300" />
        <div>
          <p className="font-bold text-white">Checklist do app</p>
          <p className="mt-1">Rotas protegidas, bucket privado, signed URLs para fotos, RLS nas tabelas e nenhum secret no frontend.</p>
          <p className="mt-2">Treinos offline pendentes: <strong>{pending}</strong></p>
        </div>
      </section>

      {message && <p className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p>}

      <button onClick={logout} className="btn-primary flex w-full items-center justify-center gap-2"><LogOut size={18} /> Sair da conta</button>
    </div>
  )
}
