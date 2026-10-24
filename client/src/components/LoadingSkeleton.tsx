export function PosterCardSkeleton({ layout = 'grid' }: { layout?: 'rail' | 'grid' }) {
  return (
    <div className={layout === 'rail' ? 'w-[148px] shrink-0 sm:w-[168px] lg:w-[188px]' : 'w-full'}>
      <div className="aspect-[2/3] animate-pulse bg-raised" />
      <div className="mt-3 h-3 w-3/4 animate-pulse bg-raised" />
      <div className="mt-2 h-2.5 w-1/2 animate-pulse bg-raised" />
    </div>
  )
}

export function PosterRailSkeleton() {
  return (
    <section className="py-8 sm:py-10" aria-hidden="true">
      <div className="shell">
        <div className="mb-5 h-6 w-44 animate-pulse bg-raised" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 7 }).map((_, index) => (
            <PosterCardSkeleton key={index} layout="rail" />
          ))}
        </div>
      </div>
    </section>
  )
}

export function HeroSkeleton() {
  return (
    <section className="relative flex min-h-[560px] items-end border-b border-line bg-surface" aria-hidden="true">
      <div className="shell w-full pb-16 pt-32">
        <div className="h-2.5 w-28 animate-pulse bg-raised" />
        <div className="mt-6 h-12 w-2/3 max-w-xl animate-pulse bg-raised" />
        <div className="mt-4 h-3 w-48 animate-pulse bg-raised" />
        <div className="mt-6 h-3 w-full max-w-lg animate-pulse bg-raised" />
        <div className="mt-2 h-3 w-4/5 max-w-md animate-pulse bg-raised" />
        <div className="mt-8 flex gap-3">
          <div className="h-12 w-40 animate-pulse bg-raised" />
          <div className="h-12 w-40 animate-pulse bg-raised" />
        </div>
      </div>
    </section>
  )
}

export function GridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <PosterCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function DetailsSkeleton() {
  return (
    <div className="shell pt-28 pb-20" aria-hidden="true">
      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <div className="aspect-[2/3] w-full max-w-[260px] animate-pulse bg-raised" />
        <div>
          <div className="h-3 w-24 animate-pulse bg-raised" />
          <div className="mt-5 h-10 w-3/4 animate-pulse bg-raised" />
          <div className="mt-4 h-3 w-56 animate-pulse bg-raised" />
          <div className="mt-8 h-3 w-full max-w-2xl animate-pulse bg-raised" />
          <div className="mt-3 h-3 w-full max-w-xl animate-pulse bg-raised" />
          <div className="mt-3 h-3 w-2/3 animate-pulse bg-raised" />
        </div>
      </div>
    </div>
  )
}

export function EpisodeListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse bg-raised" />
      ))}
    </div>
  )
}
