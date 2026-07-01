import {Activity,ArrowLeftRight,BarChart3,Camera,Dumbbell,History,Home,Ruler,Settings} from 'lucide-react'
import { NavLink, useParams } from 'react-router-dom'

const baseItems = [
  { label: 'Início', icon: Home, path: 'dashboard' },
  { label: 'Histórico', icon: History, path: 'history' },
  { label: 'Evolução', icon: BarChart3, path: 'progress' },
  { label: 'Medidas', icon: Ruler, path: 'measurements' },
  { label: 'Fotos', icon: Camera, path: 'photos' },
  { label: 'Config', icon: Settings, path: 'settings' },
  { label: "Perfis",icon: ArrowLeftRight,path: 'profiles'}
]

export default function BottomNav() {
  const { profileId } = useParams()
  if (!profileId) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur safe-bottom">
      <div className="mx-auto grid max-w-xl grid-cols-7 gap-1">
        {baseItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path === 'profiles'? '/profiles': `/${item.path}/${profileId}`}   
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition ${
                  isActive ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
