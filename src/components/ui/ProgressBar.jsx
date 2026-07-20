import { cn } from '../../theme/tokens'

export default function ProgressBar({ value = 0, className = '', showLabel = false }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-300">Progresso</span>
          <span className="font-bold text-[#c8ff3d]">{safeValue}%</span>
        </div>
      )}

      <div className="h-1.5 overflow-hidden rounded-full bg-[#272a2f]">
        <div
          className={cn('h-full rounded-full bg-[#c8ff3d] transition-all duration-500')}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}
