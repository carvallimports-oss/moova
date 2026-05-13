export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-8">
      <div className="space-y-1.5">
        <div className="h-7 w-20 bg-[#E0D8CE] rounded animate-pulse" />
        <div className="h-4 w-32 bg-[#E0D8CE] rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-16 bg-[#E0D8CE] rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[#E0D8CE] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
