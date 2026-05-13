import { DashboardSkeleton } from "@/components/dashboard/skeletons"

export default function Loading() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8">
      <DashboardSkeleton />
    </div>
  )
}
