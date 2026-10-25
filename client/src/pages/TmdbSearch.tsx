import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams, Link } from 'react-router-dom'
import { errorMessage } from '../lib/api'
import { useTmdbSearchQuery } from '../lib/queries'
import { GridSkeleton } from '../components/LoadingSkeleton'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import TitleImage from '../components/ui/TitleImage'
import { Button } from '../components/ui/Button'
import { typeLabel } from '../lib/format'

export default function TmdbSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = (searchParams.get('q') ?? '').trim()
  const typeParam = searchParams.get('type')
  const type = typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all'

  const [term, setTerm] = useState(queryParam)

  useEffect(() => {
    setTerm(queryParam)
  }, [queryParam])

  const searchQuery = useTmdbSearchQuery(queryParam, type, queryParam.length >= 2)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const next = term.trim()
    if (next.length < 2) return
    setSearchParams({ q: next, type })
  }

  const results = searchQuery.data?.results ?? []

  const watchLink = (item: { id: number; type: string }) =>
    item.type === 'tv' ? `/watch/tv/${item.id}` : `/watch/movie/${item.id}`

  return (
    <div className="shell pb-16 pt-20 sm:pb-20 sm:pt-28 lg:pt-36">
      <div className="flex items-center gap-3">
        <span className="h-[2px] w-6 bg-primary" aria-hidden="true" />
        <p className="eyebrow">Search on TMDB</p>
      </div>
      <h1 className="mt-2 sm:mt-4 font-serif text-2xl leading-tight text-white sm:text-4xl lg:text-5xl">
        {queryParam ? `TMDB results for “${queryParam}”` : 'Search TMDB'}
      </h1>

      <form onSubmit={submit} className="mt-6 sm:mt-8 flex w-full max-w-xl items-center border border-line">
        <Search size={16} className="ml-3 text-muted" aria-hidden="true" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search movies and TV shows on TMDB"
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
            description="Search by film or series name on TMDB. Results use the real TMDB id for CineSrc embedding."
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
            description={`TMDB returned no titles for “${queryParam}”. Check the spelling or try a shorter search term.`}
          />
        ) : (
          <>
            <p className="mb-6 text-xs text-muted">
              {results.length} {results.length === 1 ? 'result' : 'results'} from TMDB
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((item) => (
                <article
                  key={item.id}
                  className="group relative w-full"
                >
                  <Link to={watchLink(item)} className="block focus:outline-none">
                    <div className="relative aspect-[2/3] overflow-hidden bg-surface">
                      {item.poster ? (
                        <TitleImage
                          src={item.poster}
                          alt={`${item.title} poster`}
                          title={item.title}
                          priority
                          imageClassName="h-full w-full object-cover transition-transform duration-300 ease-editorial group-hover:scale-[1.035]"
                        />
                      ) : (
                        <div className="h-full w-full animate-pulse bg-surface" aria-hidden="true" />
                      )}
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[2px] origin-left scale-x-0 bg-primary transition-transform duration-300 ease-editorial group-hover:scale-x-100 group-focus-visible:scale-x-100" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-1 bg-bg/90 px-3 py-2 opacity-0 transition-all duration-300 ease-editorial group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                        <p className="text-[9px] uppercase tracking-widest text-muted">
                          {typeLabel(item.type)}
                          {item.year ? ` · ${item.year}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-white/90 transition-colors group-hover:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-muted">
                        {[item.year, typeLabel(item.type)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
