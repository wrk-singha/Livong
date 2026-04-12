import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  error?: string
}

export function Input({ label, icon, error, className = "", ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            {icon}
          </div>
        )}
        <input
          className={`input ${icon ? "pl-9!" : ""} ${error ? "border-error!" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function TextArea({ label, error, className = "", ...props }: TextAreaProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      )}
      <textarea
        className={`w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ring)] transition-all placeholder:text-faint text-foreground resize-none ${error ? "border-error!" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  )
}
