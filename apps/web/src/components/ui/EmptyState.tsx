import type { ReactNode } from "react"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, subtitle, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`text-center py-16 animate-fade-in-up ${className}`}>
      <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4 text-dim">
        {icon}
      </div>
      <p className="text-dim mb-1">{title}</p>
      {subtitle && <p className="text-xs text-faint mt-1">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
