import { cn, tokens } from '../../theme/tokens'

const variants = {
  green: cn(tokens.border.active, tokens.surface.activeSoft, tokens.text.active),
  slate: cn(tokens.border.subtle, tokens.surface.soft, tokens.text.body),
  amber: cn(tokens.border.warning, tokens.surface.warningSoft, tokens.text.warning),
  red: cn(tokens.border.danger, tokens.surface.dangerSoft, tokens.text.danger)
}

export default function Badge({ children, variant = 'slate', className = '' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 text-xs font-bold',
        tokens.radius.pill,
        variants[variant] || variants.slate,
        className
      )}
    >
      {children}
    </span>
  )
}