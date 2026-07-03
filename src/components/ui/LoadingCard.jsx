import Card from './Card'

export default function LoadingCard({ lines = 3 }) {
  return (
    <Card>
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-2/3 rounded-full bg-slate-800" />
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-4 rounded-full bg-slate-800"
            style={{ width: `${90 - index * 12}%` }}
          />
        ))}
      </div>
    </Card>
  )
}