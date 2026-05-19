export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 h-full flex flex-col">
      <div className="mb-6">
        <div className="h-7 bg-[#EAE3D9] rounded w-40 animate-pulse" />
        <div className="h-4 bg-[#EAE3D9] rounded w-56 mt-2 animate-pulse" />
      </div>
      <div className="flex gap-3 overflow-x-hidden">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="shrink-0 w-56">
            <div className="h-4 bg-[#EAE3D9] rounded w-24 mb-3 animate-pulse" />
            {[...Array(2)].map((_, j) => (
              <div key={j} className="h-20 bg-[#EAE3D9] rounded-lg mb-2 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
