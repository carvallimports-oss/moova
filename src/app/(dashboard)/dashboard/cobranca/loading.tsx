export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-8">
      <div className="space-y-1.5">
        <div className="h-7 w-24 bg-[#E0D8CE] rounded animate-pulse" />
        <div className="h-4 w-40 bg-[#E0D8CE] rounded animate-pulse" />
      </div>
      <div className="h-20 bg-[#E0D8CE] rounded-xl animate-pulse" />
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="h-48 bg-[#E0D8CE] rounded-xl animate-pulse" />
        <div className="h-48 bg-[#E0D8CE] rounded-xl animate-pulse" />
      </div>
      <div className="h-24 bg-[#E0D8CE] rounded-xl animate-pulse" />
    </div>
  )
}
