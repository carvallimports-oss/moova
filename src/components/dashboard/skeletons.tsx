import { cn } from "@/lib/utils"

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-[#D4C5A0] rounded-lg", className)} />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Skeleton className="h-40 lg:col-span-2" />
        <Skeleton className="h-40" />
      </div>
    </div>
  )
}

export function ConversasListSkeleton() {
  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-220px)]">
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-full" />
    </div>
  )
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-60 shrink-0 space-y-2">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 3 }).map((_, j) => (
            <Skeleton key={j} className="h-20" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ImoveisSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-0">
          <Skeleton className="h-32 rounded-b-none rounded-t-lg" />
          <Skeleton className="h-24 rounded-t-none rounded-b-lg" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  )
}
