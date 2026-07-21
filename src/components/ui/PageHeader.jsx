export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className = ''
}) {
  return (
    <header className={`mb-10 flex items-start justify-between gap-5 border-b border-[#2A2A2E] pb-6 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="rhc-kicker mb-3">{eyebrow}</p>
        )}

        <h1 className="max-w-4xl text-4xl font-[760] leading-[1.02] tracking-[-.045em] text-[#F5F5F7] sm:text-5xl">{title}</h1>

        {subtitle && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#8E8E93]">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
