import { Pause, Play, RotateCcw, SkipForward, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function RestTimer({ seconds = 60, autoStartKey = null }) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const [remaining, setRemaining] = useState(safeSeconds)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const endAtRef = useRef(null)
  const intervalRef = useRef(null)

  function calculateRemaining() {
    if (!endAtRef.current) return remaining
    return Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
  }

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function notifyFinished() {
    if ('vibrate' in navigator) {
      navigator.vibrate([250, 100, 250])
    }
  }

  function startTimer(duration = remaining || safeSeconds) {
    if (!duration) return

    endAtRef.current = Date.now() + duration * 1000
    setRemaining(duration)
    setRunning(true)
    setFinished(false)
  }

  function pauseTimer() {
    const currentRemaining = calculateRemaining()

    clearTimer()
    endAtRef.current = null
    setRemaining(currentRemaining)
    setRunning(false)
  }

  function resetTimer() {
    clearTimer()
    endAtRef.current = null
    setRemaining(safeSeconds)
    setRunning(false)
    setFinished(false)
  }

  function skipTimer() {
    clearTimer()
    endAtRef.current = null
    setRemaining(0)
    setRunning(false)
    setFinished(true)
    notifyFinished()
  }

  function addSeconds(extraSeconds) {
    const currentRemaining = running ? calculateRemaining() : remaining
    startTimer(currentRemaining + extraSeconds)
  }

  useEffect(() => {
    setRemaining(safeSeconds)
    setRunning(false)
    setFinished(false)
    endAtRef.current = null
    clearTimer()
  }, [safeSeconds])

  useEffect(() => {
    if (!autoStartKey) return
    startTimer(safeSeconds)
  }, [autoStartKey, safeSeconds])

  useEffect(() => {
    if (!running) {
      clearTimer()
      return undefined
    }

    clearTimer()

    intervalRef.current = setInterval(() => {
      const nextRemaining = calculateRemaining()

      setRemaining(nextRemaining)

      if (nextRemaining <= 0) {
        clearTimer()
        endAtRef.current = null
        setRunning(false)
        setFinished(true)
        notifyFinished()
      }
    }, 250)

    return clearTimer
  }, [running])

  useEffect(() => {
    function handleVisibilityChange() {
      if (!running) return

      const nextRemaining = calculateRemaining()
      setRemaining(nextRemaining)

      if (nextRemaining <= 0) {
        clearTimer()
        endAtRef.current = null
        setRunning(false)
        setFinished(true)
        notifyFinished()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [running])

  const label = useMemo(() => {
    const min = String(Math.floor(remaining / 60)).padStart(2, '0')
    const sec = String(remaining % 60).padStart(2, '0')
    return `${min}:${sec}`
  }, [remaining])

  const progress = safeSeconds
    ? Math.max(0, Math.min(100, ((safeSeconds - remaining) / safeSeconds) * 100))
    : 100

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">
            {finished
              ? 'Descanso finalizado'
              : running
                ? 'Descansando...'
                : 'Descanso'}
          </p>

          <p className={`font-mono text-4xl font-black ${finished ? 'text-emerald-300' : 'text-white'}`}>
            {label}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-2xl bg-slate-800 p-3 text-slate-100 transition hover:bg-slate-700"
            onClick={() => (running ? pauseTimer() : startTimer())}
            aria-label={running ? 'Pausar descanso' : 'Iniciar descanso'}
          >
            {running ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            type="button"
            className="rounded-2xl bg-slate-800 p-3 text-slate-100 transition hover:bg-slate-700"
            onClick={() => addSeconds(15)}
            aria-label="Adicionar quinze segundos"
          >
            <Plus size={18} />
          </button>

          <button
            type="button"
            className="rounded-2xl bg-slate-800 p-3 text-slate-100 transition hover:bg-slate-700"
            onClick={resetTimer}
            aria-label="Reiniciar descanso"
          >
            <RotateCcw size={18} />
          </button>

          <button
            type="button"
            className="rounded-2xl bg-slate-800 p-3 text-slate-100 transition hover:bg-slate-700"
            onClick={skipTimer}
            aria-label="Pular descanso"
          >
            <SkipForward size={18} />
          </button>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}