import { Film, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
  icon?: LucideIcon
}

export default function EmptyState({
  title,
  description,
  action,
  icon: Icon = Film,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start border-t border-line py-16">
      <Icon size={22} className="text-accent" aria-hidden="true" />
      <h2 className="mt-5 font-serif text-2xl text-white">{title}</h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  )
}
