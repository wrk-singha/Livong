import type { ReactNode } from "react"

type BadgeVariant = "info" | "success" | "warning" | "error" | "accent" | "neutral"

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  info: "bg-info-surface text-info border-info-border",
  success: "bg-success-surface text-success-text border-success-border",
  warning: "bg-warning-surface text-warning border-warning-border",
  error: "bg-error-surface text-error border-error-border",
  accent: "bg-accent-surface text-accent border-accent/20",
  neutral: "bg-surface-alt text-muted border-border",
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-medium border ${VARIANT_CLASSES[variant]} ${className}`}>
      {children}
    </span>
  )
}
