const STAR_PATH = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"

interface StarRatingDisplayProps {
  rating: number
  count?: number
  size?: number
  className?: string
}

export function StarRatingDisplay({ rating, count, size = 14, className = "" }: StarRatingDisplayProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={star <= Math.round(rating) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            className={star <= Math.round(rating) ? "text-warning" : "text-faint"}
          >
            <polygon points={STAR_PATH} />
          </svg>
        ))}
      </div>
      {rating > 0 && <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>}
      {count !== undefined && <span className="text-xs text-dim">({count})</span>}
    </div>
  )
}

interface StarRatingPickerProps {
  rating: number
  onChange: (rating: number) => void
  size?: number
  className?: string
}

export function StarRatingPicker({ rating, onChange, size = 32, className = "" }: StarRatingPickerProps) {
  return (
    <div className={`flex items-center justify-center gap-2 py-2 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={star <= rating ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            className={star <= rating ? "text-warning" : "text-faint"}
          >
            <polygon points={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  )
}
