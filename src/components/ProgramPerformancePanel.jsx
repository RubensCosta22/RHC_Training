import { ChevronDown, ChevronUp, Gauge, Target, TrendingUp } from 'lucide-react'
import { useState } from 'react'

export default function ProgramPerformancePanel({ stats }) {
  const [open, setOpen] = useState(false)
  if (!stats) return null

  const { program, phase, week, durationWeeks, summary, baseline, progression } = stats
  const progress = Math.min(100, Math.round((week / durationWeeks) * 100))

  return (
    <section className="mb-10 border-y border-[#2A2A2E] py-5">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#C8FF3D]">Programa ativo</p>
          <h2 className="mt-1 truncate text-xl font-semibold text-[#F5F5F7]">{program?.name}</h2>
          <p className="mt-1 text-sm text-[#8E8E93]">Semana {week} de {durationWeeks} · {phase?.name || 'Fase atual'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold tabular-nums text-[#F5F5F7]">{progress}%</p>
          <p className="text-xs text-[#8E8E93]">do ciclo</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#1C1C1F]">
        <div className="h-full rounded-full bg-[#C8FF3D]" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-[#2A2A2E]">
        <div className="pr-3">
          <p className="text-xs text-[#8E8E93]">Aderência</p>
          <p className="mt-1 text-xl font-semibold text-[#F5F5F7]">{summary.adherence}%</p>
        </div>
        <div className="px-3">
          <p className="text-xs text-[#8E8E93]">RPE médio</p>
          <p className="mt-1 text-xl font-semibold text-[#F5F5F7]">{summary.averageRpe || '—'}</p>
        </div>
        <div className="pl-3">
          <p className="text-xs text-[#8E8E93]">Progressões</p>
          <p className="mt-1 text-xl font-semibold text-[#F5F5F7]">{summary.increases}</p>
        </div>
      </div>

      <button type="button" onClick={() => setOpen((current) => !current)} className="mt-5 flex w-full items-center justify-between border-t border-[#2A2A2E] pt-4 text-left text-sm font-semibold text-[#F5F5F7]">
        Detalhes do programa
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} className="text-[#8E8E93]" />}
      </button>

      {open && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F5F7]"><Target size={16} className="text-[#C8FF3D]" /> Sessões de força</div>
            <p className="mt-2 text-sm text-[#8E8E93]">{summary.completedStrengthSessions}/{summary.expectedStrengthSessions} concluídas · {summary.accepted} sugestões aceitas</p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#F5F5F7]"><Gauge size={16} className="text-[#8E8E93]" /> Baseline de corrida</div>
            <p className="mt-2 text-sm text-[#8E8E93]">{baseline.distance_km || 10} km · {baseline.time_minutes || 50} min · {baseline.pace_min_km || 5}:00 min/km</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F5F7]"><TrendingUp size={16} className="text-[#C8FF3D]" /> Variações acompanhadas</div>
            <div className="mt-2 divide-y divide-[#2A2A2E]">
              {progression.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate text-[#F5F5F7]">{item.name}</span>
                  <span className={item.progressPercent >= 0 ? 'text-[#C8FF3D]' : 'text-amber-300'}>{item.progressPercent > 0 ? '+' : ''}{item.progressPercent}%</span>
                </div>
              ))}
              {!progression.length && <p className="py-3 text-sm text-[#8E8E93]">As métricas aparecem após as primeiras exposições.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
