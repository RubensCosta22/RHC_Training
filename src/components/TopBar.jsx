import { Activity, WifiOff } from 'lucide-react'
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
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  return (
    <header className="sticky top-0 z-30 -mx-5 mb-10 border-b border-white/[.06] bg-[#08090a]/85 px-5 py-4 backdrop-blur-2xl sm:-mx-8 sm:px-8">
      <div className="mx-auto flex items-center justify-between gap-3">
        <Link to={profileId ? `/dashboard/${profileId}` : '/profiles'} className="flex min-w-0 items-center gap-3" aria-label="RHC Training — inicio">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#c8ff3d] text-[#111400]"><Activity size={17} strokeWidth={2.8}/></div>
          <p className="text-[13px] font-extrabold tracking-[-.03em] text-[#f5f7f2]">RHC<span className="ml-1 font-medium text-[#62676f]">/ TRAINING</span></p>
        </Link>
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#92979f]">
          {online ? <span className="h-1.5 w-1.5 rounded-full bg-[#c8ff3d]"/> : <WifiOff size={13} className="text-[#ffb55e]"/>}
          {online ? 'Sincronizado' : 'Modo offline'}
        </span>
      </div>
    </header>
  )
}
