export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className = ''
}) {
  return (
    <header className={`mb-6 flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-sm font-bold text-emerald-300">{eyebrow}</p>
        )}

        <h1 className="truncate text-3xl font-black text-white">{title}</h1>

        {subtitle && (
          <p className="mt-1 text-slate-400">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}