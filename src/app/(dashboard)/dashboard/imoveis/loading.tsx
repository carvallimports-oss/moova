import { ImoveisSkeleton } from "@/components/dashboard/skeletons"

export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-6">
      <div className="h-8 w-32 animate-pulse bg-[#E0D8CE] rounded-lg" />
      <ImoveisSkeleton />
    </div>
  )
}
