import { BarChart3, Dumbbell, History, Home, UserRound } from 'lucide-react'
import { NavLink, useParams } from 'react-router-dom'

const baseItems = [
  { label: 'Início', icon: Home, path: 'dashboard' },
  { label: 'Histórico', icon: History, path: 'history' },
  { label: 'Treino', icon: Dumbbell, path: 'workout' },
  { label: 'Evolução', icon: BarChart3, path: 'progress' },
  { label: 'Perfil', icon: UserRound, path: 'profiles' }
]

export default function BottomNav() {
  const { profileId } = useParams()
  if (!profileId) return null

  function getPath(item) {
    if (item.path === 'profiles') return '/profiles'
    if (item.path === 'workout') return `/workout/${profileId}/A`
    return `/${item.path}/${profileId}`
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur safe-bottom">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {baseItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={getPath(item)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition ${
                  isActive
                    ? 'text-emerald-300'
                    : 'text-slate-500 hover:text-white'
                }`
              }
            >
              <div
                className={`grid h-9 w-9 place-items-center rounded-2xl ${
                  item.path === 'workout'
                    ? 'border border-emerald-400 bg-emerald-400/10 text-emerald-300 shadow-lg shadow-emerald-950/40'
                    : ''
                }`}
              >
                <Icon size={19} />
              </div>
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}