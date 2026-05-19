export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-8">
      <div className="h-8 bg-[#EAE3D9] rounded w-48 animate-pulse" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-[#E0D8CE] rounded-xl p-6 space-y-4">
          <div className="h-5 bg-[#EAE3D9] rounded w-32 animate-pulse" />
          {[...Array(3)].map((_, j) => (
            <div key={j} className="h-4 bg-[#EAE3D9] rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}
