import { AlertCircle } from 'lucide-react'
import { Button } from './ui/Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  compact?: boolean
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={
        compact
          ? 'border-l-2 border-primary bg-surface px-5 py-4'
          : 'flex flex-col items-start border-t border-line py-16'
      }
    >
      <div className="flex items-center gap-3">
        <AlertCircle size={18} className="text-primary" aria-hidden="true" />
        <h2 className={compact ? 'text-sm font-medium text-white' : 'font-serif text-2xl text-white'}>
          {title}
        </h2>
      </div>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
