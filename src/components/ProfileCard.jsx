import { ArrowRight, Dumbbell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { saveSelectedProfile } from '../utils/storage'

function Avatar({ profile }) {
  const avatar = profile.avatar_url || profile.name?.[0]
  if (avatar?.startsWith?.('http')) {
    return <img src={avatar} alt={profile.name} className="h-16 w-16 rounded-3xl object-cover ring-2 ring-emerald-400/30" />
  }

  return (
    <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-emerald-300 to-lime-300 text-3xl font-black text-slate-950 shadow-lg shadow-emerald-950/30">
      {avatar || profile.name?.[0]}
    </div>
  )
}

export default function ProfileCard({ profile }) {
  return (
    <article className="card-glow">
      <div className="relative flex items-center gap-4">
        <Avatar profile={profile} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black">{profile.name}</h2>
          <p className="text-sm text-slate-400">{profile.age} anos • {profile.goal}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <Dumbbell size={16} />
            {profile.lastWorkout ? `Último treino: ${profile.lastWorkout.workout_type} em ${profile.lastWorkout.date}` : 'Nenhum treino registrado'}
          </p>
        </div>
      </div>
      <Link
        to={`/dashboard/${profile.id}`}
        onClick={() => saveSelectedProfile(profile.id)}
        className="btn-primary relative mt-5 flex w-full items-center justify-center gap-2"
      >
        Entrar no perfil <ArrowRight size={18} />
      </Link>
    </article>
  )
}
