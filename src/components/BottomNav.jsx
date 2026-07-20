import { BarChart3, Dumbbell, History, Home, Settings } from 'lucide-react'
import { NavLink, useParams } from 'react-router-dom'

const items = [
  { label: 'Inicio', icon: Home, path: 'dashboard' },
  { label: 'Historico', icon: History, path: 'history' },
  { label: 'Treino', icon: Dumbbell, path: 'workout' },
  { label: 'Evolucao', icon: BarChart3, path: 'progress' },
  { label: 'Ajustes', icon: Settings, path: 'settings' }
]

export default function BottomNav() {
  const { profileId } = useParams()
  if (!profileId) return null
  const getPath = (item) => item.path === 'workout' ? `/workout/${profileId}/A` : `/${item.path}/${profileId}`

  return <nav className="fixed inset-x-0 bottom-3 z-40 px-3 safe-bottom" aria-label="Navegacao principal">
    <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[22px] border border-white/[.09] bg-[#111315]/90 p-1.5 shadow-[0_16px_50px_rgba(0,0,0,.48)] backdrop-blur-2xl">
      {items.map((item) => { const Icon=item.icon; return <NavLink key={item.path} to={getPath(item)} className={({isActive})=>`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[9px] font-semibold transition ${isActive?'bg-[#c8ff3d] text-[#111400]':'text-[#62676f] hover:bg-white/[.04] hover:text-[#f5f7f2]'}`}>
        <span className="grid h-7 w-7 place-items-center"><Icon size={18}/></span>{item.label}
      </NavLink>})}
    </div>
  </nav>
}
