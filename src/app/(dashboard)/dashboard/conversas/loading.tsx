import { ConversasListSkeleton } from "@/components/dashboard/skeletons"

export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-28 bg-[#D4C5A0] rounded animate-pulse" />
          <div className="h-4 w-36 bg-[#D4C5A0] rounded animate-pulse" />
        </div>
      </div>
      <ConversasListSkeleton />
    </div>
  )
}
