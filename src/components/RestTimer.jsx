import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export default function RestTimer({ seconds = 60 }) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)

  useEffect(() => setRemaining(seconds), [seconds])

  useEffect(() => {
    if (!running) return undefined
    if (remaining <= 0) {
      setRunning(false)
      if ('vibrate' in navigator) navigator.vibrate([200, 80, 200])
      return undefined
    }
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [running, remaining])

  const label = useMemo(() => {
    const min = String(Math.floor(remaining / 60)).padStart(2, '0')
    const sec = String(remaining % 60).padStart(2, '0')
    return `${min}:${sec}`
  }, [remaining])

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/60 p-2">
      <span className="min-w-14 text-center font-mono text-lg font-bold text-emerald-300">{label}</span>
      <button type="button" className="rounded-xl bg-slate-800 p-2" onClick={() => setRunning((value) => !value)} aria-label="Iniciar ou pausar descanso">
        {running ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button type="button" className="rounded-xl bg-slate-800 p-2" onClick={() => { setRemaining(seconds); setRunning(false) }} aria-label="Reiniciar descanso">
        <RotateCcw size={18} />
      </button>
    </div>
  )
}
