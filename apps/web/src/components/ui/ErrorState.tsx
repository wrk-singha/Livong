import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

/**
 * Mirrors EmptyState's shape but signals failure (red icon).
 * Use when a query errored — distinct from "no data".
 */
export function ErrorState({
  title = "Something went wrong",
  subtitle = "Check your connection and try again.",
  onRetry,
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`text-center py-16 animate-fade-in-up ${className}`}>
      <div className="w-16 h-16 bg-error-surface rounded-full flex items-center justify-center mx-auto mb-4 text-error">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-foreground font-medium">{title}</p>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
      {(onRetry || action) && (
        <div className="mt-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm font-medium text-accent hover:underline"
            >
              Try again
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
