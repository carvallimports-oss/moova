export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-6">
      <div className="space-y-1.5">
        <div className="h-7 w-24 bg-[#D4C5A0] rounded animate-pulse" />
        <div className="h-4 w-48 bg-[#D4C5A0] rounded animate-pulse" />
      </div>
      <div className="h-48 bg-[#D4C5A0] rounded-xl animate-pulse" />
      <div className="h-32 bg-[#D4C5A0] rounded-xl animate-pulse" />
    </div>
  )
}
