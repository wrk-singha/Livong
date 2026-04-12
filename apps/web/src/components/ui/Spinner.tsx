interface SpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_MAP = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-3",
  lg: "w-10 h-10 border-3",
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div className={`${SIZE_MAP[size]} border-border border-t-secondary rounded-full animate-spin ${className}`} />
  )
}

export function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  )
}
