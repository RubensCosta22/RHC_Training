import { Inbox } from 'lucide-react'
export default function EmptyState({
  title = 'Nada por aqui ainda',
  description = 'Quando houver informações, elas aparecerão nesta área.',
  icon: Icon = Inbox,
  action
}) {
  return (
    <section className="border-y border-[#272a2f] py-14 text-center">
      <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-[#141619] text-[#92979f]">
        <Icon size={24} />
      </div>

      <h2 className="text-xl font-[680] text-[#f5f7f2]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#92979f]">{description}</p>

      {action && <div className="mt-4">{action}</div>}
    </section>
  )
}
