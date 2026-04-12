import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonVariant = "primary" | "accent" | "outline" | "ghost"
type ButtonSize = "sm" | "md" | "lg"

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "py-2 px-3 text-xs rounded-lg",
  md: "py-2.5 px-4 text-sm rounded-lg",
  lg: "py-3 px-5 text-sm rounded-lg",
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  accent: "btn-accent",
  outline: "border border-border text-secondary bg-transparent hover:bg-surface-alt transition-colors cursor-pointer",
  ghost: "text-secondary bg-transparent hover:bg-surface-alt transition-colors cursor-pointer",
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} font-medium ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className={`w-4 h-4 border-2 rounded-full animate-spin ${
            variant === "primary" ? "border-white/30 border-t-white" :
            variant === "accent" ? "border-white/30 border-t-white" :
            "border-border border-t-secondary"
          }`} />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
