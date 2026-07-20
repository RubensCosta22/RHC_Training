import { cn, tokens } from '../../theme/tokens'

const variants = {
  primary: cn(
    tokens.surface.active,
    tokens.text.activeDark,
    'font-bold hover:bg-[#d4ff68]'
  ),
  secondary: cn(
    tokens.border.subtle,
    tokens.surface.cardStrong,
    tokens.text.body,
    'hover:border-[#4b5058] hover:bg-[#1a1d21] hover:text-white'
  ),
  ghost: cn(
    tokens.text.body,
    'hover:bg-[#1a1d21] hover:text-white'
  ),
  danger: cn(
    tokens.border.danger,
    tokens.surface.dangerSoft,
    tokens.text.danger,
    'hover:bg-red-400/20'
  )
}

export default function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  icon: Icon,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-3 text-sm',
        tokens.radius.button,
        tokens.transition,
        variants[variant] || variants.primary,
        className
      )}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  )
}
