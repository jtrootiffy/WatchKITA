import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { GridSkeleton } from '../components/LoadingSkeleton'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import MovieGrid from '../components/MovieGrid'
import { Button } from '../components/ui/Button'

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = (searchParams.get('q') ?? '').trim()
  const typeParam = searchParams.get('type')
  const type = typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all'

  const [term, setTerm] = useState(queryParam)

  useEffect(() => {
    setTerm(queryParam)
  }, [queryParam])

  const searchQuery = useQuery({
    queryKey: ['search-results', queryParam, type],
    queryFn: ({ signal }) => api.search(queryParam, type, signal),
    enabled: queryParam.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const next = term.trim()
    if (next.length < 2) return
    setSearchParams({ q: next, type })
  }

  const results = (searchQuery.data?.results ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    year: item.year,
    type: item.type,
  }))

  return (
    <div className="shell pb-16 pt-20 sm:pb-20 sm:pt-28 lg:pt-36">
      <div className="flex items-center gap-3">
        <span className="h-[2px] w-6 bg-primary" aria-hidden="true" />
        <p className="eyebrow">Search</p>
      </div>
      <h1 className="mt-2 sm:mt-4 font-serif text-2xl leading-tight text-white sm:text-4xl lg:text-5xl">
        {queryParam ? `Results for “${queryParam}”` : 'Search the catalog'}
      </h1>

      <form onSubmit={submit} className="mt-6 sm:mt-8 flex w-full max-w-xl items-center border border-line">
        <Search size={16} className="ml-3 text-muted" aria-hidden="true" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search movies and TV shows"
          aria-label="Search titles"
          className="h-11 w-full bg-transparent px-3 text-sm text-white placeholder:text-muted/70 focus:outline-none"
        />
        <Button type="submit" size="sm" className="m-1.5">
          Search
        </Button>
      </form>

      <div className="mt-10">
        {queryParam.length < 2 ? (
          <EmptyState
            title="Enter a title to search"
            description="Search by film or series name. For browsing, use Discover to filter the catalog by genre, year, and region."
          />
        ) : searchQuery.isLoading ? (
          <GridSkeleton count={12} />
        ) : searchQuery.isError ? (
          <ErrorState
            title="Search could not be completed"
            message={errorMessage(searchQuery.error)}
            onRetry={() => void searchQuery.refetch()}
          />
        ) : results.length === 0 ? (
          <EmptyState
            title="No matching titles"
            description={`Watchmode returned no titles for “${queryParam}”. Check the spelling or try a shorter search term.`}
          />
        ) : (
          <>
            <p className="mb-6 text-xs text-muted">
              {results.length} {results.length === 1 ? 'result' : 'results'} from the Watchmode
              catalog
            </p>
            <MovieGrid items={results} />
          </>
        )}
      </div>
    </div>
  )
}
