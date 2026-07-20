import { ArrowUpRight, Dumbbell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { saveSelectedProfile } from '../utils/storage'

function Avatar({ profile }) {
  const avatar=profile.avatarSignedUrl||profile.avatar_url||profile.name?.[0]
  if(avatar?.startsWith?.('http'))return <img src={avatar} alt={profile.name} className="h-14 w-14 rounded-full object-cover"/>
  return <div className="grid h-14 w-14 place-items-center rounded-full bg-[#1a1d21] text-xl font-black text-[#c8ff3d]">{avatar||profile.name?.[0]}</div>
}

export default function ProfileCard({ profile,onSelect }) {
  return <Link to={`/dashboard/${profile.id}`} onClick={async()=>{saveSelectedProfile(profile.id);if(onSelect)await onSelect()}} className="group flex items-center gap-4 border-b border-[#272a2f] py-5 transition hover:bg-white/[.015]">
    <Avatar profile={profile}/><div className="min-w-0 flex-1"><h2 className="text-xl font-[680] tracking-[-.03em]">{profile.name}</h2><p className="mt-0.5 text-sm text-[#92979f]">{profile.age} anos · {profile.goal}</p><p className="mt-2 flex items-center gap-2 text-xs text-[#62676f]"><Dumbbell size={14}/>{profile.lastWorkout?`Treino ${profile.lastWorkout.workout_type} · ${profile.lastWorkout.date}`:'Pronto para o primeiro treino'}</p></div><ArrowUpRight size={19} className="text-[#62676f] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#c8ff3d]"/>
  </Link>
}
