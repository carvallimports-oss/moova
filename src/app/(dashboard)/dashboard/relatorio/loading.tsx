export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12 pt-4">
      <div className="text-center space-y-2">
        <div className="h-4 w-40 bg-[#E0D8CE] rounded animate-pulse mx-auto" />
        <div className="h-8 w-64 bg-[#E0D8CE] rounded animate-pulse mx-auto" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-[#E0D8CE] rounded-2xl animate-pulse" />
        <div className="h-32 bg-[#E0D8CE] rounded-2xl animate-pulse" />
      </div>
      <div className="h-40 bg-[#E0D8CE] rounded-2xl animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-[#E0D8CE] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
