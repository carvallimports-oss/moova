export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-4xl mx-auto">
      <div className="h-7 bg-[#EAE3D9] rounded w-48 mb-2 animate-pulse" />
      <div className="h-4 bg-[#EAE3D9] rounded w-72 mb-8 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-[#E0D8CE] rounded-2xl p-6 space-y-4">
            <div className="h-10 bg-[#EAE3D9] rounded-xl w-10 animate-pulse" />
            <div className="h-5 bg-[#EAE3D9] rounded w-36 animate-pulse" />
            <div className="h-8 bg-[#EAE3D9] rounded w-24 animate-pulse" />
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-4 bg-[#EAE3D9] rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
