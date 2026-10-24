import { useMemo } from 'react'
import { usePosterBatchQuery } from '../lib/queries'
import PosterRail from './PosterRail'

interface SimilarTitlesProps {
  ids: number[]
}

export default function SimilarTitles({ ids }: SimilarTitlesProps) {
  const limited = useMemo(() => [...new Set(ids)].slice(0, 14), [ids])
  const { data, isLoading, isError } = usePosterBatchQuery(limited, limited.length > 0)

  if (limited.length === 0) return null

  const items = (data?.posters ?? []).map((poster) => ({
    id: poster.id,
    title: poster.title,
    year: poster.year,
    type: poster.type,
  }))

  return (
    <div className="border-t border-line pt-6">
      <PosterRail
        title="Similar titles"
        description="Related titles suggested by Watchmode."
        items={items}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  )
}
