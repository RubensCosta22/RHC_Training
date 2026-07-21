import { Activity, Gauge, Target, TrendingDown, TrendingUp } from 'lucide-react'

function Stat({ label, value, detail, icon: Icon }) {
  return (
    <div className="border-t border-[#272a2f] py-4">
      <div className="mb-2 flex items-center justify-between text-[#62676f]">
        <span className="text-[10px] font-bold uppercase tracking-[.14em]">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-[760] tracking-[-.04em] text-[#f5f7f2]">{value}</p>
      <p className="mt-1 text-xs text-[#62676f]">{detail}</p>
    </div>
  )
}

export default function ProgramPerformancePanel({ stats }) {
  if (!stats) return null

  const { program, phase, week, durationWeeks, summary, baseline, progression } = stats

  return (
    <section className="mb-16 overflow-hidden rounded-[28px] border border-[#30362a] bg-[linear-gradient(145deg,#151a12,#0c0f0d)] p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="rhc-kicker mb-2">Programa ativo</p>
          <h2 className="text-3xl font-[780] tracking-[-.05em] text-[#f5f7f2]">{program?.name}</h2>
          <p className="mt-2 text-sm text-[#92979f]">Semana {week} de {durationWeeks} · {phase?.name || 'Fase atual'}</p>
        </div>
        <div className="min-w-[220px]">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#92979f]"><span>Progresso do ciclo</span><span>{Math.round((week / durationWeeks) * 100)}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-[#252a22]"><div className="h-full rounded-full bg-[#c8ff3d]" style={{ width: `${Math.min(100, (week / durationWeeks) * 100)}%` }} /></div>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-x-5 lg:grid-cols-4">
        <Stat label="Aderência" value={`${summary.adherence}%`} detail={`${summary.completedStrengthSessions}/${summary.expectedStrengthSessions} sessões de força`} icon={Target} />
        <Stat label="RPE médio" value={summary.averageRpe || '—'} detail="esforço registrado" icon={Gauge} />
        <Stat label="Progressões" value={summary.increases} detail={`${summary.accepted} sugestões aceitas`} icon={TrendingUp} />
        <Stat label="Regressões" value={summary.regressions} detail={`${summary.holds} exposições mantidas`} icon={TrendingDown} />
      </div>

      <div className="mt-4 grid gap-6 border-t border-[#272a2f] pt-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-[#74c7ff]"/><p className="text-sm font-bold">Baseline de corrida</p></div>
          <p className="text-3xl font-[760]">{baseline.distance_km || 10} km</p>
          <p className="mt-1 text-sm text-[#92979f]">{baseline.time_minutes || 50} min · {baseline.pace_min_km || 5}:00 min/km</p>
        </div>

        <div className="lg:col-span-8 lg:border-l lg:border-[#272a2f] lg:pl-7">
          <p className="mb-3 text-sm font-bold">Variações mais acompanhadas</p>
          <div className="grid gap-x-5 sm:grid-cols-2">
            {progression.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between border-t border-[#272a2f] py-3">
                <div className="min-w-0 pr-3"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-xs text-[#62676f]">{item.exposures} exposições · RPE {item.averageRpe || '—'}</p></div>
                <span className={`text-sm font-bold ${item.progressPercent >= 0 ? 'text-[#c8ff3d]' : 'text-[#ffb55e]'}`}>{item.progressPercent > 0 ? '+' : ''}{item.progressPercent}%</span>
              </div>
            ))}
            {!progression.length && <p className="text-sm text-[#62676f]">As métricas aparecem após as primeiras exposições do programa.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
