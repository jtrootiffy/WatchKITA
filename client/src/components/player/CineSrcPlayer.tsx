import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { buildCineSrcUrl, type CineSrcMediaType } from '@/lib/player'
import { Button } from '../ui/Button'
import ErrorState from '../ErrorState'

const CINE_SRC_ORIGIN = 'https://cinesrc.st'

interface CineSrcPlayerProps {
  mediaType: CineSrcMediaType
  tmdbId: number
  season?: number
  episode?: number
  autoplay?: boolean
  onError?: (message: string) => void
  onReady?: () => void
  onEpisodeChange?: (season: number, episode: number) => void
  onClose?: () => void
}

type CineSrcEventData = {
  type?: string
  season?: number
  episode?: number
  internalNavigation?: boolean
  error?: string
  source?: string
  [key: string]: unknown
}

export default function CineSrcPlayer({
  mediaType,
  tmdbId,
  season: initialSeason,
  episode: initialEpisode,
  autoplay = true,
  onError,
  onReady,
  onEpisodeChange,
  onClose,
}: CineSrcPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [season, setSeason] = useState(initialSeason ?? 1)
  const [episode, setEpisode] = useState(initialEpisode ?? 1)
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearReadyTimeout = useCallback(() => {
    if (readyTimeoutRef.current !== null) {
      clearTimeout(readyTimeoutRef.current)
      readyTimeoutRef.current = null
    }
  }, [])

  const handleError = useCallback(
    (message: string) => {
      clearReadyTimeout()
      setPlayerError(message)
      setIsLoading(false)
      setPlayerReady(false)
      onError?.(message)
    },
    [clearReadyTimeout, onError],
  )

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== CINE_SRC_ORIGIN) return
      const data = event.data as CineSrcEventData | undefined
      if (!data || typeof data.type !== 'string') return

      switch (data.type) {
        case 'cinesrc:ready': {
          clearReadyTimeout()
          setIsLoading(false)
          setPlayerError(null)
          setPlayerReady(true)
          onReady?.()
          break
        }

        case 'cinesrc:error': {
          handleError(typeof data.error === 'string' ? data.error : 'The player reported an error.')
          break
        }

        case 'cinesrc:ended': {
          setPlayerReady(false)
          break
        }

        case 'cinesrc:nextepisode': {
          const nextSeason =
            typeof data.season === 'number' && Number.isFinite(data.season) ? data.season : null
          const nextEpisode =
            typeof data.episode === 'number' && Number.isFinite(data.episode) ? data.episode : null
          const internal = data.internalNavigation === true

          if (nextSeason !== null && nextEpisode !== null) {
            setSeason(nextSeason)
            setEpisode(nextEpisode)
            if (!internal) {
              onEpisodeChange?.(nextSeason, nextEpisode)
            }
          }
          break
        }

        case 'cinesrc:close': {
          onClose?.()
          break
        }

        default: {
          break
        }
      }
    },
    [clearReadyTimeout, handleError, onReady, onEpisodeChange, onClose],
  )

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  useEffect(() => {
    setSeason(initialSeason ?? 1)
    setEpisode(initialEpisode ?? 1)
  }, [initialSeason, initialEpisode])

  const src = buildCineSrcUrl({
    mediaType,
    tmdbId,
    season: mediaType === 'tv' ? season : undefined,
    episode: mediaType === 'tv' ? episode : undefined,
    autoplay,
    muted: false,
    color: '#D00000',
    controls: true,
    autonext: mediaType === 'tv',
    autoskip: false,
    back: onClose ? 'close' : undefined,
  })

  const handleIframeLoad = () => {
    // An iframe load event only means the player HTML loaded, not that a video
    // is playable. Wait for cinesrc:ready before marking the player ready.
    readyTimeoutRef.current = setTimeout(() => {
      if (!playerReady && !playerError) {
        setIsLoading(false)
      }
    }, 8000)
  }

  const handleRetry = () => {
    setPlayerError(null)
    setIsLoading(true)
    setPlayerReady(false)
    clearReadyTimeout()
    if (iframeRef.current) {
      iframeRef.current.src = src
    }
  }

  return (
    <section className="watch-player-section bg-bg">
      <div className="shell pt-6 pb-16 lg:pt-10 lg:pb-20">
        <div className="relative aspect-video w-full max-w-5xl mx-auto overflow-hidden bg-black rounded-xl shadow-2xl ring-1 ring-line/60">
          {playerError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-8">
              <ErrorState
                title="Playback unavailable"
                message={playerError}
                onRetry={handleRetry}
                compact
              />
            </div>
          ) : (
            <>
              <iframe
                ref={iframeRef}
                src={src}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
                loading="lazy"
                onLoad={handleIframeLoad}
                aria-label="CineSrc video player"
                tabIndex={-1}
              />
              {isLoading && !playerError && !playerReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                  <Loader2 size={28} className="animate-spin text-primary mb-3" aria-hidden="true" />
                  <p className="text-sm text-muted">Loading player...</p>
                </div>
              )}
            </>
          )}
        </div>

        {playerError && (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted max-w-md">
              The CineSrc player could not load this title. Streams are provided by a third party
              and availability is not guaranteed for every title.
            </p>
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
