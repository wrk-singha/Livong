interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return <div className={`rounded-md animate-shimmer ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="space-y-1 ml-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-2 w-10 ml-auto" />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  )
}
