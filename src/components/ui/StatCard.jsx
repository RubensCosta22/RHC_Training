export default function StatCard({ title, value, subtitle, icon: Icon, className = '' }) {
  return <section className={`border-t border-[#272a2f] px-1 py-5 ${className}`}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#62676f]">{title}</p>
      {Icon && <Icon size={17} className="text-[#92979f]"/>}
    </div>
    <p className="tabular-nums text-3xl font-[730] tracking-[-.045em] text-[#f5f7f2]">{value}</p>
    {subtitle && <p className="mt-1 text-xs text-[#62676f]">{subtitle}</p>}
  </section>
}
