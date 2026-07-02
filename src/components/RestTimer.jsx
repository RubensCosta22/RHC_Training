import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export default function RestTimer({ seconds = 60, autoStartKey = null }) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    setRemaining(seconds)
    setRunning(false)
  }, [seconds])

  useEffect(() => {
    if (!autoStartKey) return

    setRemaining(seconds)
    setRunning(true)
  }, [autoStartKey, seconds])

  useEffect(() => {
    if (!running) return undefined

    if (remaining <= 0) {
      setRunning(false)

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 80, 200])
      }

      return undefined
    }

    const timer = setTimeout(() => {
      setRemaining((value) => value - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [running, remaining])

  const label = useMemo(() => {
    const min = String(Math.floor(remaining / 60)).padStart(2, '0')
    const sec = String(remaining % 60).padStart(2, '0')
    return `${min}:${sec}`
  }, [remaining])

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">
            {running ? 'Descanso em andamento' : remaining === 0 ? 'Descanso concluído' : 'Descanso'}
          </p>
          <p className="font-mono text-3xl font-black text-white">{label}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-2xl bg-slate-800 p-3 text-slate-100 transition hover:bg-slate-700"
            onClick={() => setRunning((value) => !value)}
            aria-label="Iniciar ou pausar descanso"
          >
            {running ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            type="button"
            className="rounded-2xl bg-slate-800 p-3 text-slate-100 transition hover:bg-slate-700"
            onClick={() => {
              setRemaining(seconds)
              setRunning(false)
            }}
            aria-label="Reiniciar descanso"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, ((seconds - remaining) / seconds) * 100))}%`
          }}
        />
      </div>
    </div>
  )
}