import { TableSkeleton } from "@/components/dashboard/skeletons"

export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-24 bg-[#D4C5A0] rounded animate-pulse" />
          <div className="h-4 w-32 bg-[#D4C5A0] rounded animate-pulse" />
        </div>
      </div>
      <div className="h-10 w-full bg-[#D4C5A0] rounded-lg animate-pulse" />
      <TableSkeleton rows={8} />
    </div>
  )
}
