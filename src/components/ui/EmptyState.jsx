import { Inbox } from 'lucide-react'
import Card from './Card'

export default function EmptyState({
  title = 'Nada por aqui ainda',
  description = 'Quando houver informações, elas aparecerão nesta área.',
  icon: Icon = Inbox,
  action
}) {
  return (
    <Card className="text-center">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-3xl bg-slate-800 text-slate-300">
        <Icon size={24} />
      </div>

      <h2 className="font-black text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>

      {action && <div className="mt-4">{action}</div>}
    </Card>
  )
}