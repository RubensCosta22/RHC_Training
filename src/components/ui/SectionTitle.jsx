export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  action,
  className = ''
}) {
  return (
    <div className={`mb-5 mt-10 flex items-end justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && (
          <p className="rhc-kicker mb-2">
            {eyebrow}
          </p>
        )}

        <h2 className="text-xl font-[680] tracking-[-.03em] text-[#f5f7f2]">{title}</h2>

        {subtitle && (
          <p className="mt-1 text-sm text-[#92979f]">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
