import { MapPin, Pause, Play, RotateCcw, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  accumulateGpsPoint,
  calculatePaceSecondsPerKm,
  formatDuration,
  formatPace,
  getElapsedSeconds,
  pauseTimer,
  resetTimer,
  startTimer
} from '../lib/runningSession'

function normalizeNumber(value) {
  const number = Number(String(value).replace(',', '.'))
  return Number.isFinite(number) && number >= 0 ? number : 0
}

export default function RunningSessionPanel({ value, onChange, onImportantEvent }) {
  const running = value || {}
  const timer = running.timer || resetTimer()
  const [now, setNow] = useState(Date.now())
  const watchIdRef = useRef(null)
  const gpsStateRef = useRef({ lastPoint: null, distanceMeters: 0 })
  const runningRef = useRef(running)

  runningRef.current = running

  const elapsedSeconds = timer.status === 'running'
    ? getElapsedSeconds(timer, now)
    : Math.max(0, Number(running.durationSeconds || timer.accumulatedSeconds) || 0)
  const distanceMeters = Math.max(0, Number(running.distanceMeters) || 0)
  const pace = calculatePaceSecondsPerKm(distanceMeters, elapsedSeconds)

  useEffect(() => {
    gpsStateRef.current.distanceMeters = distanceMeters
  }, [distanceMeters])

  useEffect(() => {
    if (timer.status !== 'running') return undefined
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [timer.status])

  useEffect(() => () => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  function patch(next, important = false) {
    const current = runningRef.current || {}
    const currentTimer = current.timer || resetTimer()
    const merged = { ...current, ...next }
    const effectiveDuration = next.durationSeconds ?? getElapsedSeconds(merged.timer || currentTimer)
    const effectiveDistance = next.distanceMeters ?? Math.max(0, Number(current.distanceMeters) || 0)
    merged.averagePaceSecondsPerKm = calculatePaceSecondsPerKm(effectiveDistance, effectiveDuration)
    runningRef.current = merged
    onChange(merged)
    if (important) onImportantEvent?.(merged)
  }

  function start() {
    patch({ timer: startTimer(timer), mode: running.mode === 'gps' ? 'gps' : 'stopwatch' })
  }

  function pause() {
    const nextTimer = pauseTimer(timer)
    patch({ timer: nextTimer, durationSeconds: nextTimer.accumulatedSeconds }, true)
  }

  function finish() {
    const nextTimer = timer.status === 'running' ? pauseTimer(timer) : timer
    stopGps()
    patch({ timer: nextTimer, durationSeconds: getElapsedSeconds(nextTimer), status: 'finished' }, true)
  }

  function reset() {
    stopGps()
    gpsStateRef.current = { lastPoint: null, distanceMeters: 0 }
    patch({ timer: resetTimer(), durationSeconds: 0, distanceMeters: 0, averagePaceSecondsPerKm: null, mode: 'manual', gpsStatus: 'idle', status: 'idle' }, true)
  }

  function stopGps() {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    gpsStateRef.current.lastPoint = null
  }

  function startGps() {
    if (!navigator.geolocation) {
      patch({ gpsStatus: 'unavailable', mode: 'manual' }, true)
      return
    }
    stopGps()
    gpsStateRef.current = {
      lastPoint: null,
      distanceMeters: Math.max(0, Number(runningRef.current?.distanceMeters) || 0)
    }
    patch({ gpsStatus: 'acquiring', mode: 'gps', timer: startTimer(timer) })
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        }
        const nextGpsState = accumulateGpsPoint(gpsStateRef.current, point)
        gpsStateRef.current = nextGpsState
        if (!nextGpsState.accepted) {
          patch({ gpsStatus: nextGpsState.reason === 'accuracy' ? 'weak' : 'tracking' })
          return
        }
        patch({ gpsStatus: 'tracking', distanceMeters: nextGpsState.distanceMeters, mode: 'gps' })
      },
      () => {
        stopGps()
        patch({ gpsStatus: 'denied', mode: 'manual' }, true)
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    )
  }

  return (
    <section className="mb-6 border border-[#2A2A2E] bg-[#141416] p-4" aria-labelledby="running-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#C8FF3D]">Corrida</p>
          <h2 id="running-title" className="mt-1 text-xl font-semibold text-[#F5F5F7]">Distância e tempo</h2>
        </div>
        <span className="text-xs text-[#8E8E93]">{running.mode === 'gps' ? 'GPS opcional' : 'Registro manual'}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <label className="rounded-lg bg-[#0A0A0B] p-3">
          <span className="text-xs uppercase tracking-wide text-[#8E8E93]">Distância (km)</span>
          <input type="number" min="0" step="0.01" value={distanceMeters ? (distanceMeters / 1000).toFixed(2) : ''} onChange={(event) => patch({ distanceMeters: Math.round(normalizeNumber(event.target.value) * 1000), mode: 'manual' })} className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-semibold" placeholder="0,00" />
        </label>
        <label className="rounded-lg bg-[#0A0A0B] p-3">
          <span className="text-xs uppercase tracking-wide text-[#8E8E93]">Tempo (segundos)</span>
          <input type="number" min="0" value={elapsedSeconds || ''} onChange={(event) => patch({ durationSeconds: Math.round(normalizeNumber(event.target.value)), timer: { status: 'paused', accumulatedSeconds: Math.round(normalizeNumber(event.target.value)), startedAt: null }, mode: 'manual' })} className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-semibold" placeholder="0" />
        </label>
        <div className="col-span-2 rounded-lg bg-[#0A0A0B] p-3 md:col-span-1">
          <span className="text-xs uppercase tracking-wide text-[#8E8E93]">Ritmo médio</span>
          <p className="mt-1 text-2xl font-semibold text-[#F5F5F7]">{formatPace(pace)}</p>
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="font-mono text-5xl font-semibold tracking-tight text-[#F5F5F7]">{formatDuration(elapsedSeconds)}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {timer.status === 'running' ? (
            <button type="button" onClick={pause} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#F5F5F7] px-4 font-semibold text-[#0A0A0B]"><Pause size={18} />Pausar</button>
          ) : (
            <button type="button" onClick={start} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#C8FF3D] px-4 font-semibold text-[#0A0A0B]"><Play size={18} />{elapsedSeconds ? 'Continuar' : 'Iniciar'}</button>
          )}
          <button type="button" onClick={finish} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#2A2A2E] px-4 font-semibold"><Square size={18} />Finalizar corrida</button>
          <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#2A2A2E] px-4 font-semibold"><RotateCcw size={18} />Zerar</button>
        </div>
      </div>

      <div className="mt-5 border-t border-[#2A2A2E] pt-4">
        <button type="button" onClick={startGps} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#2A2A2E] px-4 text-sm font-semibold"><MapPin size={18} />Medir com GPS</button>
        <p className="mt-2 text-xs leading-5 text-[#8E8E93]">O GPS é opcional. A rota não é salva; apenas distância, tempo e ritmo. Se o sinal falhar, informe os dados manualmente.</p>
        {running.gpsStatus && running.gpsStatus !== 'idle' && <p className="mt-2 text-xs text-[#C8FF3D]" role="status">GPS: {running.gpsStatus}</p>}
      </div>
    </section>
  )
}
