import { Dumbbell, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isOnline } from '../utils/storage'

export default function TopBar() {
  const { profileId } = useParams()
  const [online, setOnline] = useState(isOnline())

  useEffect(() => {
    const update = () => setOnline(isOnline())
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-5 border-b border-slate-800/80 bg-slate-950/85 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <Link to={profileId ? `/dashboard/${profileId}` : '/profiles'} className="flex min-w-0 items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/20">
            <Dumbbell size={22} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-tight text-white">Meu Treino</p>
            <p className="truncate text-[11px] font-semibold text-slate-400">TotalPass seguro</p>
          </div>
        </Link>

        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className="hidden items-center gap-1 rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-blue-200 sm:flex">
            <ShieldCheck size={13} /> RLS ativo
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${online ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/30 bg-amber-400/10 text-amber-200'}`}>
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  )
}
