type AvatarSize = "sm" | "md" | "lg"

const SIZE_MAP: Record<AvatarSize, string> = {
  sm: "w-7 h-7 text-[11px]",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-xl",
}

const SHAPE_MAP = {
  circle: "rounded-full",
  rounded: "rounded-xl",
  square: "rounded-lg",
}

interface AvatarProps {
  name: string
  size?: AvatarSize
  shape?: keyof typeof SHAPE_MAP
  gradient?: boolean
  className?: string
}

export function Avatar({ name, size = "md", shape = "rounded", gradient = true, className = "" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={`${SIZE_MAP[size]} ${SHAPE_MAP[shape]} flex items-center justify-center font-semibold text-white shrink-0 ${
        gradient ? "" : "bg-primary/10 text-primary"
      } ${className}`}
      style={gradient ? { background: "linear-gradient(135deg, var(--accent), var(--accent-secondary))" } : undefined}
    >
      {initials}
    </div>
  )
}
