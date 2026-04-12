interface VerifiedBadgeProps {
  size?: number
  className?: string
}

export function VerifiedBadge({ size = 16, className = "" }: VerifiedBadgeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-label="Verified"
    >
      <circle cx="12" cy="12" r="11" fill="var(--accent)" />
      <path d="m8 12 3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
