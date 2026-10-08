import { useEffect, useState } from 'react'
import { calculatePaceSecondsPerKm, formatPace } from '../lib/runningSession'

function formatDistance(meters) {
  if (!meters) return ''
  return String(Number((meters / 1000).toFixed(3))).replace('.', ',')
}

function durationParts(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  return { minutes: String(Math.floor(total / 60)), seconds: String(total % 60).padStart(2, '0') }
}

function parseDistance(text) {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d*(?:\.\d{0,3})?$/.test(normalized)) return null
  if (!normalized || normalized === '.') return 0
  return Math.round(Number(normalized) * 1000)
}

export default function RunningSessionPanel({ value, onChange, onImportantEvent }) {
  const running = value || {}
  const [distanceInput, setDistanceInput] = useState(() => formatDistance(Number(running.distanceMeters) || 0))
  const [timeInput, setTimeInput] = useState(() => durationParts(running.durationSeconds))
  const [activeField, setActiveField] = useState(null)
  const distanceMeters = Math.max(0, Number(running.distanceMeters) || 0)
  const durationSeconds = Math.max(0, Number(running.durationSeconds) || 0)
  const pace = calculatePaceSecondsPerKm(distanceMeters, durationSeconds)

  // Keep inputs editable without overwriting intermediate text such as "6," or "0".
  // External draft restoration still updates fields that are not being edited.
  useEffect(() => {
    if (activeField !== 'distance') setDistanceInput(formatDistance(distanceMeters))
  }, [distanceMeters, activeField])
  useEffect(() => {
    if (activeField !== 'minutes' && activeField !== 'seconds') setTimeInput(durationParts(durationSeconds))
  }, [durationSeconds, activeField])

  function patch(next) {
    const merged = {
      ...running,
      ...next,
      mode: 'manual',
      gpsStatus: 'idle',
      timer: null,
      status: 'finished'
    }
    merged.averagePaceSecondsPerKm = calculatePaceSecondsPerKm(
      Math.max(0, Number(merged.distanceMeters) || 0),
      Math.max(0, Number(merged.durationSeconds) || 0)
    )
    onChange(merged)
    onImportantEvent?.(merged)
  }

  function changeDistance(text) {
    const meters = parseDistance(text)
    if (meters === null) return
    setDistanceInput(text)
    patch({ distanceMeters: meters })
  }

  function changeTime(part, text) {
    if (!/^\d*$/.test(text)) return
    if (part === 'seconds' && text !== '' && Number(text) > 59) return
    const next = { ...timeInput, [part]: text }
    setTimeInput(next)
    const minutes = Number(next.minutes || 0)
    const seconds = Number(next.seconds || 0)
    patch({ durationSeconds: minutes * 60 + seconds })
  }

  return (
    <section className="mb-6 border border-[#2A2A2E] bg-[#141416] p-4" aria-labelledby="running-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#C8FF3D]">Corrida</p>
          <h2 id="running-title" className="mt-1 text-xl font-semibold text-[#F5F5F7]">Registrar corrida</h2>
        </div>
        <span className="text-xs text-[#8E8E93]">Registro manual</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="col-span-2 rounded-lg bg-[#0A0A0B] p-3 sm:col-span-1">
          <span className="text-xs uppercase tracking-wide text-[#8E8E93]">Distância (km)</span>
          <input type="text" inputMode="decimal" value={distanceInput}
            onFocus={() => setActiveField('distance')} onBlur={() => setActiveField(null)}
            onChange={(event) => changeDistance(event.target.value)}
            className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-semibold text-[#F5F5F7] outline-none"
            placeholder="6,02" aria-label="Distância em quilômetros" />
        </label>
        <div className="col-span-2 grid grid-cols-2 gap-3 sm:col-span-1">
          <label className="rounded-lg bg-[#0A0A0B] p-3">
            <span className="text-xs uppercase tracking-wide text-[#8E8E93]">Minutos</span>
            <input type="text" inputMode="numeric" value={timeInput.minutes}
              onFocus={() => setActiveField('minutes')} onBlur={() => setActiveField(null)}
              onChange={(event) => changeTime('minutes', event.target.value)}
              className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-semibold text-[#F5F5F7] outline-none"
              aria-label="Minutos da corrida" placeholder="34" />
          </label>
          <label className="rounded-lg bg-[#0A0A0B] p-3">
            <span className="text-xs uppercase tracking-wide text-[#8E8E93]">Segundos</span>
            <input type="text" inputMode="numeric" value={timeInput.seconds}
              onFocus={() => setActiveField('seconds')} onBlur={() => setActiveField(null)}
              onChange={(event) => changeTime('seconds', event.target.value)}
              className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-semibold text-[#F5F5F7] outline-none"
              aria-label="Segundos da corrida" placeholder="08" />
          </label>
        </div>
        <div className="col-span-2 rounded-lg bg-[#0A0A0B] p-3">
          <span className="text-xs uppercase tracking-wide text-[#8E8E93]">Ritmo médio (automático)</span>
          <p className="mt-1 text-2xl font-semibold text-[#F5F5F7]">{formatPace(pace)}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#8E8E93]">Informe a distância e o tempo do seu aplicativo de corrida. Sem GPS ou cronômetro.</p>
    </section>
  )
}
