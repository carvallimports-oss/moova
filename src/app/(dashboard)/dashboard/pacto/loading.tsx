export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-6 pb-12">
      <div className="text-center space-y-2 pt-4">
        <div className="h-4 w-32 bg-[#E0D8CE] rounded animate-pulse mx-auto" />
        <div className="h-8 w-64 bg-[#E0D8CE] rounded animate-pulse mx-auto" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-[#E0D8CE] rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}
