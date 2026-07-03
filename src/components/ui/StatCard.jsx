import Card from './Card'

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className = ''
}) {
  return (
    <Card className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{title}</p>
        {Icon && <Icon size={18} className="text-emerald-300" />}
      </div>

      <p className="text-2xl font-black text-white">{value}</p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}
    </Card>
  )
}