import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Info, Play } from 'lucide-react'
import { criticScoreLabel, runtimeLabel, userRatingLabel } from '../lib/format'
import { staggerContainer, fadeUp } from '../lib/motion'
import type { TitleDetails } from '../types'
import { Button, ButtonLink } from './ui/Button'
import TitleImage from './ui/TitleImage'
import { HeroSkeleton } from './LoadingSkeleton'

interface FeaturedHeroProps {
  slides: TitleDetails[]
  isLoading: boolean
  onRetry?: () => void
}

const ROTATE_MS = 9000

export default function FeaturedHero({ slides, isLoading, onRetry }: FeaturedHeroProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLElement>(null)

  const safeIndex = slides.length > 0 ? index % slides.length : 0
  const slide = slides[safeIndex]

  const goTo = useCallback(
    (next: number) => {
      if (slides.length === 0) return
      setIndex(((next % slides.length) + slides.length) % slides.length)
    },
    [slides.length],
  )

  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [slides.length, paused, reducedMotion])

  useEffect(() => {
    if (index >= slides.length) setIndex(0)
  }, [index, slides.length])

  const meta = useMemo(() => {
    if (!slide) return []
    return [
      slide.year ? String(slide.year) : null,
      runtimeLabel(slide.runtimeMinutes),
      slide.contentRating,
      userRatingLabel(slide.userRating),
      criticScoreLabel(slide.criticScore),
    ].filter((value): value is string => Boolean(value))
  }, [slide])

  if (isLoading) return <HeroSkeleton />

  if (!slide) {
    return (
      <section className="border-b border-line bg-surface">
        <div className="shell flex min-h-[520px] items-end pb-16 pt-32">
          <div className="max-w-xl">
            <p className="eyebrow">Featured title</p>
            <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
              The catalog is warming up.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Featured titles could not be loaded. Try refreshing the page or checking the region
              selection.
            </p>
            {onRetry ? (
              <Button variant="secondary" size="sm" className="mt-6" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={containerRef}
      aria-roledescription="carousel"
      aria-label="Featured titles"
      tabIndex={-1}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          goTo(safeIndex + 1)
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          goTo(safeIndex - 1)
        }
      }}
      className="relative overflow-hidden border-b border-line bg-surface"
    >
      <div className="absolute inset-0">
        {slides.map((item, itemIndex) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-editorial ${
              itemIndex === safeIndex ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={itemIndex !== safeIndex}
          >
            {item.backdrop ? (
              <img
                src={item.backdrop}
                alt=""
                loading={itemIndex === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        ))}
        <div className="absolute inset-0 bg-bg/70" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-bg/50" />
      </div>

      {!slide.backdrop ? (
        <div className="absolute right-0 top-16 hidden h-[calc(100%-4rem)] w-[38%] items-center justify-center border-l border-line bg-bg/40 lg:flex">
          <div className="aspect-[2/3] w-[260px]">
            <TitleImage
              src={slide.posterLarge ?? slide.poster}
              alt={`${slide.title} poster`}
              title={slide.title}
              className="h-full w-full"
              imageClassName="h-full w-full object-cover"
              priority
            />
          </div>
        </div>
      ) : null}

      <div className="shell relative flex min-h-[600px] items-end pb-14 pt-32 sm:min-h-[640px] sm:pb-16 lg:min-h-[700px] lg:pb-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            variants={staggerContainer}
            initial={reducedMotion ? false : 'hidden'}
            animate="visible"
            exit={reducedMotion ? undefined : { opacity: 0, y: -8, transition: { duration: 0.16 } }}
            className="max-w-2xl"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="h-[2px] w-6 bg-primary" aria-hidden="true" />
              <p className="eyebrow">Featured title</p>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-4 font-serif text-4xl leading-[1.05] text-white sm:text-5xl lg:text-6xl xl:text-7xl"
            >
              {slide.title}
            </motion.h1>

            {meta.length > 0 ? (
              <motion.ul
                variants={fadeUp}
                className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-widest text-white/80"
                aria-label="Title details"
              >
                {meta.map((value, metaIndex) => (
                  <li key={`${value}-${metaIndex}`} className="flex items-center gap-3">
                    {metaIndex > 0 ? (
                      <span className="h-3 w-px bg-accent" aria-hidden="true" />
                    ) : null}
                    <span>{value}</span>
                  </li>
                ))}
              </motion.ul>
            ) : null}

            {slide.genreNames.length > 0 ? (
              <motion.p variants={fadeUp} className="mt-3 text-xs text-muted">
                {slide.genreNames.slice(0, 4).join(' · ')}
              </motion.p>
            ) : null}

            {slide.plotOverview ? (
              <motion.p
                variants={fadeUp}
                className="mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base"
              >
                {slide.plotOverview}
              </motion.p>
            ) : null}

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink to={`/title/${slide.id}`} size="lg" variant="primary">
                <Info size={16} aria-hidden="true" />
                Explore title
              </ButtonLink>
              <ButtonLink
                to={`/title/${slide.id}#where-to-watch`}
                size="lg"
                variant="secondary"
              >
                <Play size={15} aria-hidden="true" />
                Where to watch
              </ButtonLink>
            </motion.div>

            {slides.length > 1 ? (
              <motion.div variants={fadeUp} className="mt-10 flex items-center gap-2">
                {slides.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(itemIndex)}
                    aria-label={`Show featured title ${itemIndex + 1}: ${item.title}`}
                    aria-current={itemIndex === safeIndex}
                    className={`h-[3px] transition-all duration-300 ease-editorial ${
                      itemIndex === safeIndex
                        ? 'w-8 bg-primary'
                        : 'w-4 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </motion.div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 h-[2px] bg-primary"
        key={slide.id}
        initial={{ width: '0%' }}
        animate={{ width: reducedMotion || paused || slides.length < 2 ? '0%' : '100%' }}
        transition={{ duration: paused || reducedMotion ? 0 : ROTATE_MS / 1000, ease: 'linear' }}
        aria-hidden="true"
      />
    </section>
  )
}
