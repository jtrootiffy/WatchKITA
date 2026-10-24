import PosterCard from './PosterCard'
import type { TitleSummary } from '../types'

interface MovieGridProps {
  items: TitleSummary[]
  priorityCount?: number
}

export default function MovieGrid({ items, priorityCount = 6 }: MovieGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item, index) => (
        <PosterCard key={item.id} item={item} priority={index < priorityCount} />
      ))}
    </div>
  )
}
