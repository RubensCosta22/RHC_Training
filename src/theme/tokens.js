export const tokens = {
  radius: {
    card: 'rounded-3xl',
    button: 'rounded-2xl',
    pill: 'rounded-full'
  },
  border: {
    subtle: 'border border-slate-800',
    active: 'border border-emerald-400/40',
    danger: 'border border-red-400/40',
    warning: 'border border-amber-400/40'
  },
  surface: {
    base: 'bg-slate-950',
    card: 'bg-slate-900/80',
    cardStrong: 'bg-slate-900',
    soft: 'bg-slate-950/60',
    active: 'bg-emerald-400',
    activeSoft: 'bg-emerald-400/10',
    dangerSoft: 'bg-red-400/10',
    warningSoft: 'bg-amber-400/10'
  },
  text: {
    title: 'text-white',
    body: 'text-slate-300',
    muted: 'text-slate-400',
    subtle: 'text-slate-500',
    active: 'text-emerald-300',
    activeDark: 'text-slate-950',
    danger: 'text-red-200',
    warning: 'text-amber-200'
  },
  shadow: {
    card: 'shadow-xl shadow-black/20',
    active: 'shadow-lg shadow-emerald-950/40'
  },
  transition: 'transition duration-200'
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}