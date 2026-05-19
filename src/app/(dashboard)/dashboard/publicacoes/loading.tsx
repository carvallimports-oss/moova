export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 space-y-6 max-w-4xl mx-auto">
      <div className="h-7 bg-[#EAE3D9] rounded w-40 animate-pulse" />
      <div className="h-4 bg-[#EAE3D9] rounded w-64 animate-pulse" />
      <div className="grid sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-[#E0D8CE] rounded-xl p-5 space-y-3">
            <div className="h-4 bg-[#EAE3D9] rounded w-28 animate-pulse" />
            <div className="h-16 bg-[#EAE3D9] rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 bg-[#EAE3D9] rounded flex-1 animate-pulse" />
              <div className="h-8 bg-[#EAE3D9] rounded flex-1 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
