"use client"

import { useState, useRef, useEffect } from "react"

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  className?: string
}

export function Select({ label, options, value, onChange, placeholder = "Select", error, className = "" }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      )}
      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={`input text-left pr-9 flex items-center ${
            value ? "text-foreground" : "text-faint"
          } ${error ? "border-error!" : ""}`}
        >
          {selected ? selected.label : placeholder}
        </button>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-20 py-1 overflow-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                  value === option.value
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-secondary hover:bg-surface-alt"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  )
}
