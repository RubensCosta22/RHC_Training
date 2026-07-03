import { ImageIcon } from 'lucide-react'
import { useState } from 'react'

function getImagePath(exercise) {
  return `/exercise-images/${exercise.id}.webp`
}

export default function ExerciseImage({
  exercise,
  alt,
  className = 'h-40',
  overlay = true,
  children
}) {
  const [failed, setFailed] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950 ${className}`}>
      {!failed && exercise?.id ? (
        <img
          src={getImagePath(exercise)}
          alt={alt || exercise.name}
          className="h-full w-full object-cover opacity-80"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl border border-emerald-400/20 bg-slate-950/50 text-emerald-300 backdrop-blur">
            <ImageIcon size={28} />
          </div>
        </div>
      )}

      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
      )}

      {children}
    </div>
  )
}