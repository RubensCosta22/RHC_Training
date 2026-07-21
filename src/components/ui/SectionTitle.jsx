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

        <h2 className="text-2xl font-[700] tracking-[-.035em] text-[#F5F5F7]">{title}</h2>

        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#8E8E93]">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
