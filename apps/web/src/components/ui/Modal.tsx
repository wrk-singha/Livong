import type { ReactNode } from "react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-sm" }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`bg-surface rounded-xl shadow-xl w-full ${maxWidth} p-5 space-y-4`}>
        {title && (
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <button
              onClick={onClose}
              className="text-dim hover:text-secondary transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
