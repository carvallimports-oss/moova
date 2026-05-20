export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 space-y-6 max-w-4xl mx-auto">
      <div className="h-7 bg-[#E2D4B9] rounded w-40 animate-pulse" />
      <div className="h-4 bg-[#E2D4B9] rounded w-64 animate-pulse" />
      <div className="grid sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-[#D4C5A0] rounded-xl p-5 space-y-3">
            <div className="h-4 bg-[#E2D4B9] rounded w-28 animate-pulse" />
            <div className="h-16 bg-[#E2D4B9] rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 bg-[#E2D4B9] rounded flex-1 animate-pulse" />
              <div className="h-8 bg-[#E2D4B9] rounded flex-1 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
