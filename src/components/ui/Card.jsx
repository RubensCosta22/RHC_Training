import { cn, tokens } from '../../theme/tokens'

export default function Card({
  children,
  className = '',
  glow = false,
  active = false,
  as: Component = 'section'
}) {
  return (
    <Component
      className={cn(
        tokens.radius.card,
        active ? tokens.border.active : tokens.border.subtle,
        glow ? 'bg-gradient-to-br from-slate-900 to-slate-950' : tokens.surface.card,
        tokens.shadow.card,
        'p-4',
        className
      )}
    >
      {children}
    </Component>
  )
}