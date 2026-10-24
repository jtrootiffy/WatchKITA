import { useState } from 'react'
import { initials } from '../lib/format'
import ErrorState from './ErrorState'
import type { CastCrew, CastMember } from '../types'

interface CastCrewSectionProps {
  data: CastCrew | undefined
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
}

function PersonTile({ person }: { person: CastMember }) {
  return (
    <li className="flex items-center gap-3 border border-line p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-surface font-serif text-sm text-white/80">
        {initials(person.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-white">{person.name}</span>
        {person.role ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted">{person.role}</span>
        ) : null}
      </span>
    </li>
  )
}

export default function CastCrewSection({
  data,
  isLoading,
  isError,
  onRetry,
}: CastCrewSectionProps) {
  const [showAllCast, setShowAllCast] = useState(false)
  const [showAllCrew, setShowAllCrew] = useState(false)

  const cast = data?.cast ?? []
  const crew = data?.crew ?? []
  const visibleCast = showAllCast ? cast : cast.slice(0, 12)
  const visibleCrew = showAllCrew ? crew : crew.slice(0, 10)

  if (!isLoading && !isError && cast.length === 0 && crew.length === 0) {
    return null
  }

  return (
    <section className="border-t border-line pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Credits</p>
          <h2 className="mt-3 font-serif text-2xl text-white sm:text-3xl">Cast &amp; crew</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse bg-raised" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6">
          <ErrorState
            compact
            title="Credits could not be loaded"
            message="Cast and crew information is unavailable for this title right now."
            onRetry={onRetry}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {cast.length > 0 ? (
            <div>
              <h3 className="eyebrow mb-3">Cast</h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCast.map((person) => (
                  <PersonTile key={`${person.personId}-${person.name}`} person={person} />
                ))}
              </ul>
              {cast.length > 12 ? (
                <button
                  type="button"
                  onClick={() => setShowAllCast((value) => !value)}
                  className="mt-4 text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-white"
                >
                  {showAllCast ? 'Show less' : `Show all ${cast.length} cast members`}
                </button>
              ) : null}
            </div>
          ) : null}

          {crew.length > 0 ? (
            <div>
              <h3 className="eyebrow mb-3">Crew</h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCrew.map((person, index) => (
                  <PersonTile
                    key={`${person.personId}-${person.role}-${index}`}
                    person={person}
                  />
                ))}
              </ul>
              {crew.length > 10 ? (
                <button
                  type="button"
                  onClick={() => setShowAllCrew((value) => !value)}
                  className="mt-4 text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-white"
                >
                  {showAllCrew ? 'Show less' : `Show all ${crew.length} crew credits`}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
