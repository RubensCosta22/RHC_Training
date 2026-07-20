import { Archive, Camera, Download, FileJson, LogOut, ShieldCheck, Upload, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { secureSignOut } from '../services/authService'
import { exportHistoryCsv, exportHistoryJson, importBackupJson } from '../services/backupService'
import { getPendingWorkouts } from '../utils/storage'
import { friendlyError } from '../utils/validation'
import PageHeader from '../components/ui/PageHeader'
import { getProfile, uploadProfileAvatar } from '../services/profileService'

export default function Settings() {
  const { profileId } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const pending = getPendingWorkouts().length

  useEffect(() => { getProfile(profileId).then(setProfile).catch((error)=>setMessage(friendlyError(error))) }, [profileId])

  function chooseAvatar(event) {
    const file = event.target.files?.[0]
    setAvatarFile(file || null)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(file ? URL.createObjectURL(file) : '')
  }

  async function saveAvatar() {
    setUploadingAvatar(true); setMessage('')
    try {
      const result = await uploadProfileAvatar(profileId, avatarFile)
      setProfile((current)=>({ ...current, avatarSignedUrl:result.signedUrl, avatar_url:result.path }))
      setAvatarFile(null); setAvatarPreview(''); setMessage('Foto de perfil atualizada com seguranca.')
    } catch (error) { setMessage(friendlyError(error)) } finally { setUploadingAvatar(false) }
  }

  async function logout() {
    await secureSignOut()
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

      <section className="mb-8 flex flex-col gap-5 border-y border-[#272a2f] py-6 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[#141619]">
          {(avatarPreview||profile?.avatarSignedUrl)?<img src={avatarPreview||profile.avatarSignedUrl} alt={`Foto de ${profile?.name||'perfil'}`} className="h-full w-full object-cover"/>:<span className="grid h-full w-full place-items-center text-3xl font-black text-[#c8ff3d]">{profile?.name?.[0]||'R'}</span>}
          <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-[#c8ff3d] text-[#111400]"><Camera size={14}/></span>
        </div>
        <div className="flex-1"><p className="rhc-kicker mb-2">Identidade</p><h2 className="text-xl font-[680]">Foto de perfil</h2><p className="mt-1 text-sm text-[#92979f]">Imagem privada, JPG, PNG ou WebP de ate 3 MB.</p></div>
        <div className="flex flex-wrap gap-2"><label className="btn-secondary inline-flex cursor-pointer items-center gap-2"><Camera size={17}/> Escolher foto<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={chooseAvatar}/></label>{avatarFile&&<button type="button" className="btn-primary" disabled={uploadingAvatar} onClick={saveAvatar}>{uploadingAvatar?'Enviando...':'Salvar foto'}</button>}</div>
      </section>

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
