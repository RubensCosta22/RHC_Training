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
        glow ? 'bg-[#141619]' : tokens.surface.card,
        tokens.shadow.card,
        'p-5',
        className
      )}
    >
      {children}
    </Component>
  )
}
