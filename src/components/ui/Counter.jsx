import { Minus, Plus } from 'lucide-react'

export default function Counter({
  value = 0,
  min = 0,
  max = 999,
  step = 1,
  onChange,
  label = 'Contador'
}) {
  const safeValue = Number(value) || 0

  function update(nextValue) {
    const bounded = Math.max(min, Math.min(max, nextValue))
    onChange?.(bounded)
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-3">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => update(safeValue - step)}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-200 transition hover:bg-slate-700"
          aria-label={`Diminuir ${label}`}
        >
          <Minus size={18} />
        </button>

        <p className="min-w-12 text-center text-3xl font-black text-white">
          {safeValue}
        </p>

        <button
          type="button"
          onClick={() => update(safeValue + step)}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-slate-950 transition hover:bg-emerald-300"
          aria-label={`Aumentar ${label}`}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}