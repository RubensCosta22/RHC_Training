export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  action,
  className = ''
}) {
  return (
    <div className={`mb-3 flex items-end justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">
            {eyebrow}
          </p>
        )}

        <h2 className="text-lg font-black text-white">{title}</h2>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}