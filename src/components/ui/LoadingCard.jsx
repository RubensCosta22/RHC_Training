export default function LoadingCard({ lines = 3 }) {
  return (
    <div className="border-y border-[#272a2f] py-8">
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-2/3 rounded-full bg-[#1a1d21]" />
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-4 rounded-full bg-[#141619]"
            style={{ width: `${90 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  )
}
