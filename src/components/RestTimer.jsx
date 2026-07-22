import { Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

let sharedAudioContext = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') sharedAudioContext = new AudioContext()
  return sharedAudioContext
}

function primeAudio() {
  try {
    const context = getAudioContext()
    if (context?.state === 'suspended') context.resume().catch(() => undefined)
  } catch {
    // O cronômetro continua funcional mesmo quando o navegador bloqueia áudio programático.
  }
}

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

  function playFinishTone() {
    try {
      const context = getAudioContext()
      if (!context || context.state !== 'running') return
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.12, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.45)
    } catch {
      // Vibração continua sendo o fallback quando áudio programático não está disponível.
    }
  }

  function notifyFinished() {
    if ('vibrate' in navigator) navigator.vibrate([250, 100, 250])
    playFinishTone()
  }

  function startTimer(duration = remaining || safeSeconds) {
    if (!duration) return
    primeAudio()
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

  useEffect(() => {
    const unlockAudio = () => primeAudio()
    document.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => document.removeEventListener('pointerdown', unlockAudio)
  }, [])

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

  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#2A2A2E] pt-3">
      <div className="min-w-0">
        <p className={`font-mono text-xl font-semibold ${finished ? 'text-[#C8FF3D]' : 'text-[#F5F5F7]'}`}>
          {label}
          <span className="ml-2 font-sans text-sm font-normal text-[#8E8E93]">
            {finished ? 'Descanso finalizado' : 'Descanso entre séries'}
          </span>
        </p>
      </div>
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#F5F5F7] transition hover:bg-[#1C1C1F]"
        onClick={() => (running ? pauseTimer() : startTimer())}
        aria-label={running ? 'Pausar descanso' : 'Iniciar descanso'}
      >
        {running ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
      </button>
    </div>
  )
}
