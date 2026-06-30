export default function DashboardCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300"><Icon size={22} /></div>}
      </div>
    </div>
  )
}
