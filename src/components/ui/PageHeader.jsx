export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className = ''
}) {
  return (
    <header className={`mb-10 flex items-start justify-between gap-5 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="rhc-kicker mb-3">{eyebrow}</p>
        )}

        <h1 className="text-4xl font-[760] leading-[1.02] tracking-[-.045em] text-[#f5f7f2] sm:text-5xl">{title}</h1>

        {subtitle && (
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#92979f]">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
