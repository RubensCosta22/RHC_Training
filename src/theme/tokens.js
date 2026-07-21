export const tokens = {
  radius: {
    input: 'rounded-[4px]',
    card: 'rounded-[8px]',
    modal: 'rounded-[12px]',
    button: 'rounded-[8px]',
    pill: 'rounded-full'
  },
  border: {
    subtle: 'border border-[#2A2A2E]',
    active: 'border border-[#C8FF3D]/50',
    danger: 'border border-[#F87171]/40',
    warning: 'border border-[#FBBF24]/40'
  },
  surface: {
    base: 'bg-[#0A0A0B]',
    raised: 'bg-[#141416]',
    card: 'bg-[#1C1C1F]',
    hover: 'bg-[#232327]',
    active: 'bg-[#C8FF3D]',
    activeSoft: 'bg-[#C8FF3D]/10',
    dangerSoft: 'bg-[#F87171]/10',
    warningSoft: 'bg-[#FBBF24]/10',
    infoSoft: 'bg-[#60A5FA]/10'
  },
  text: {
    title: 'text-[#F5F5F7]',
    body: 'text-[#F5F5F7]',
    muted: 'text-[#8E8E93]',
    active: 'text-[#C8FF3D]',
    activeDark: 'text-[#111400]',
    danger: 'text-[#F87171]',
    warning: 'text-[#FBBF24]',
    info: 'text-[#60A5FA]'
  },
  state: {
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA'
  },
  shadow: {
    card: 'shadow-none',
    active: 'shadow-none'
  },
  transition: 'transition duration-200 ease-[cubic-bezier(.2,.8,.2,1)]'
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
