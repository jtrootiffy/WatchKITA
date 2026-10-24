import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Clock, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { useDebounce } from '../hooks/useDebounce'
import { typeLabel } from '../lib/format'
import type { AutocompleteItem } from '../types'
import TitleImage from './ui/TitleImage'
import { Button } from './ui/Button'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

const RECENT_KEY = 'watchkita.recent-searches'
const MAX_RECENT = 5

function readRecent(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string').slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'movie' | 'tv'>('all')
  const [results, setResults] = useState<AutocompleteItem[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const [retryKey, setRetryKey] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const debouncedQuery = useDebounce(query, 300)

  const rememberSearch = useCallback((term: string) => {
    const cleaned = term.trim()
    if (cleaned.length < 2) return
    setRecent((current) => {
      const next = [cleaned, ...current.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(
        0,
        MAX_RECENT,
      )
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // Storage may be unavailable; recents are a convenience only.
      }
      return next
    })
  }, [])

  const close = useCallback(() => {
    onClose()
    previousFocus.current?.focus()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    previousFocus.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    setQuery('')
    setResults([])
    setStatus('idle')
    setActiveIndex(0)
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 40)

    return () => {
      document.body.style.overflow = previousOverflow
      clearTimeout(focusTimer)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const term = debouncedQuery.trim()

    if (term.length < 2) {
      setResults([])
      setStatus('idle')
      setMessage('')
      return
    }

    const controller = new AbortController()
    setStatus('loading')

    api
      .autocomplete(term, type, controller.signal)
      .then((response) => {
        setResults(response.results)
        setStatus('idle')
        setActiveIndex(0)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatus('error')
        setMessage(errorMessage(error))
        setResults([])
      })

    return () => controller.abort()
  }, [debouncedQuery, type, isOpen, retryKey])

  const openResult = useCallback(
    (result: AutocompleteItem) => {
      rememberSearch(query || result.name)
      close()
      navigate(`/title/${result.id}`)
    },
    [navigate, rememberSearch, query, close],
  )

  const openAllResults = useCallback(() => {
    const term = query.trim()
    if (term.length < 2) return
    rememberSearch(term)
    close()
    navigate(`/search?q=${encodeURIComponent(term)}&type=${type}`)
  }, [navigate, rememberSearch, query, type, close])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (results.length > 0) setActiveIndex((index) => (index + 1) % results.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (results.length > 0) {
        setActiveIndex((index) => (index - 1 + results.length) % results.length)
      }
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const active = results[activeIndex]
      if (active) openResult(active)
      else openAllResults()
      return
    }

    if (event.key === 'Tab') {
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, a[href]',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  const term = query.trim()

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[90] bg-bg"
          role="dialog"
          aria-modal="true"
          aria-label="Search titles"
          ref={dialogRef}
          onKeyDown={handleKeyDown}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-line">
              <div className="shell flex h-16 items-center gap-3 sm:h-20">
                <Search size={20} className="shrink-0 text-primary" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search movies, TV shows…"
                  aria-label="Search movies and TV shows"
                  aria-controls="search-results"
                  aria-activedescendant={
                    results[activeIndex] ? `search-option-${results[activeIndex].id}` : undefined
                  }
                  className="h-full w-full bg-transparent text-base text-white placeholder:text-muted/60 focus:outline-none sm:text-lg"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setResults([])
                      inputRef.current?.focus()
                    }}
                    aria-label="Clear search"
                    className="shrink-0 text-muted transition-colors hover:text-white"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={close}
                  className="hidden shrink-0 border border-line px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-muted hover:text-white sm:block"
                >
                  Esc
                </button>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close search"
                  className="shrink-0 p-1 text-muted transition-colors hover:text-white sm:hidden"
                >
                  <X size={22} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="shell flex items-center justify-between gap-4 border-b border-line py-3">
              <div className="flex items-center gap-1" role="group" aria-label="Filter by type">
                {(
                  [
                    { value: 'all', label: 'All' },
                    { value: 'movie', label: 'Movies' },
                    { value: 'tv', label: 'TV Shows' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={type === option.value}
                    onClick={() => setType(option.value)}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
                      type === option.value
                        ? 'bg-primary text-white'
                        : 'text-muted hover:bg-surface hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {term.length >= 2 ? (
                <button
                  type="button"
                  onClick={openAllResults}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-white"
                >
                  View all results
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="shell py-6">
                {term.length < 2 ? (
                  <div>
                    {recent.length > 0 ? (
                      <>
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="eyebrow">Recent searches</h2>
                          <button
                            type="button"
                            onClick={() => {
                              setRecent([])
                              try {
                                localStorage.removeItem(RECENT_KEY)
                              } catch {
                                // Ignore storage failures.
                              }
                            }}
                            className="text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-white"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recent.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setQuery(item)}
                              className="flex items-center gap-2 border border-line px-3 py-2 text-xs text-muted transition-colors hover:border-muted hover:text-white"
                            >
                              <Clock size={12} aria-hidden="true" />
                              {item}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="max-w-md text-sm leading-relaxed text-muted">
                        Search the full Watchmode catalog by film or series title. Availability is
                        shown for your selected region.
                      </p>
                    )}
                  </div>
                ) : status === 'loading' ? (
                  <div className="space-y-2" aria-hidden="true">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-4 py-2">
                        <div className="h-[66px] w-11 animate-pulse bg-raised" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-1/2 animate-pulse bg-raised" />
                          <div className="h-2.5 w-1/4 animate-pulse bg-raised" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : status === 'error' ? (
                  <div role="alert" className="border-l-2 border-primary bg-surface px-5 py-4">
                    <p className="text-sm text-white">Search is unavailable right now.</p>
                    <p className="mt-2 text-xs text-muted">{message}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      onClick={() => setRetryKey((value) => value + 1)}
                    >
                      Try again
                    </Button>
                  </div>
                ) : results.length === 0 ? (
                  <div>
                    <p className="font-serif text-xl text-white">No matching titles</p>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                      Nothing in the catalog matched “{term}”. Check the spelling or try a broader
                      term.
                    </p>
                  </div>
                ) : (
                  <div id="search-results" role="listbox" aria-label="Search results">
                    {results.map((result, index) => (
                      <button
                        key={`${result.id}-${index}`}
                        id={`search-option-${result.id}`}
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => openResult(result)}
                        className={`flex w-full items-center gap-4 border-l-2 px-3 py-2.5 text-left transition-colors ${
                          index === activeIndex
                            ? 'border-primary bg-surface'
                            : 'border-transparent hover:bg-surface'
                        }`}
                      >
                        <div className="h-[66px] w-11 shrink-0 overflow-hidden">
                          <TitleImage
                            src={result.imageUrl}
                            alt={`${result.name} poster`}
                            title={result.name}
                            className="h-full w-full"
                            imageClassName="h-full w-full object-cover"
                            loadingLabel="No art"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{result.name}</p>
                          <p className="mt-1 text-[11px] text-muted">
                            {[result.year, typeLabel(result.type)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <ArrowRight
                          size={15}
                          className={index === activeIndex ? 'text-primary' : 'text-muted/40'}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden border-t border-line py-3 sm:block">
              <div className="shell flex items-center gap-6 text-[10px] uppercase tracking-widest text-muted/70">
                <span>↑ ↓ Navigate</span>
                <span>Enter Open</span>
                <span>Esc Close</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
