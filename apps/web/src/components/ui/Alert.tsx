import type { ReactNode } from "react"

type AlertVariant = "error" | "success" | "warning" | "info"

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: "text-error bg-error-surface border-error-border",
  success: "text-success-text bg-success-surface border-success-border",
  warning: "text-warning bg-warning-surface border-warning-border",
  info: "text-info bg-info-surface border-info-border",
}

const ICONS: Record<AlertVariant, ReactNode> = {
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  ),
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  ),
}

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

export function Alert({ variant = "error", children, className = "" }: AlertProps) {
  return (
    <div className={`flex items-center gap-2 text-sm border px-3 py-2 rounded-lg ${VARIANT_CLASSES[variant]} ${className}`}>
      {ICONS[variant]}
      {children}
    </div>
  )
}
