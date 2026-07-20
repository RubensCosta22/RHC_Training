export const tokens = {
  radius: {
    card: 'rounded-[18px]',
    button: 'rounded-xl',
    pill: 'rounded-full'
  },
  border: {
    subtle: 'border border-[#272a2f]',
    active: 'border border-[#c8ff3d]/50',
    danger: 'border border-red-400/40',
    warning: 'border border-amber-400/40'
  },
  surface: {
    base: 'bg-[#08090a]',
    card: 'bg-[#141619]',
    cardStrong: 'bg-[#181a1e]',
    soft: 'bg-[#0d0f11]',
    active: 'bg-[#c8ff3d]',
    activeSoft: 'bg-[#c8ff3d]/10',
    dangerSoft: 'bg-red-400/10',
    warningSoft: 'bg-amber-400/10'
  },
  text: {
    title: 'text-[#f5f7f2]',
    body: 'text-[#c8cbd0]',
    muted: 'text-[#92979f]',
    subtle: 'text-[#62676f]',
    active: 'text-[#c8ff3d]',
    activeDark: 'text-[#111400]',
    danger: 'text-red-200',
    warning: 'text-amber-200'
  },
  shadow: {
    card: 'shadow-none',
    active: 'shadow-[0_10px_40px_rgba(200,255,61,.12)]'
  },
  transition: 'transition duration-200 ease-[cubic-bezier(.2,.8,.2,1)]'
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
