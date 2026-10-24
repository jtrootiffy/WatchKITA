import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, SkipForward, Volume2, VolumeX, ChevronRight, ChevronLeft } from 'lucide-react'
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
  skipTime?: number
  [key: string]: unknown
}

const QUALITIES = ['480', '720', '1080'] as const

type Quality = (typeof QUALITIES)[number]

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
  const [isMuted, setIsMuted] = useState(false)
  const [quality, setQuality] = useState<Quality>('720')
  const [skipTime, setSkipTime] = useState<number | null>(null)
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearReadyTimeout = useCallback(() => {
    if (readyTimeoutRef.current !== null) {
      clearTimeout(readyTimeoutRef.current)
      readyTimeoutRef.current = null
    }
  }, [])

  const clearSkipTimeout = useCallback(() => {
    if (skipTimeoutRef.current !== null) {
      clearTimeout(skipTimeoutRef.current)
      skipTimeoutRef.current = null
    }
  }, [])

  const sendCommand = useCallback(
    (command: string, args: unknown[] = []) => {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return
      iframe.contentWindow.postMessage(
        { type: 'cinesrc:command', command, args },
        CINE_SRC_ORIGIN,
      )
    },
    [],
  )

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

        case 'cinesrc:skipintro': {
          setSkipTime(typeof data.skipTime === 'number' ? data.skipTime : null)
          clearSkipTimeout()
          skipTimeoutRef.current = setTimeout(() => setSkipTime(null), 5000)
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
    [clearReadyTimeout, clearSkipTimeout, handleError, onReady, onEpisodeChange, onClose],
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
    muted: isMuted,
    color: '#D00000',
    controls: true,
    autonext: mediaType === 'tv',
    autoskip: false,
    quality,
    back: onClose ? 'close' : undefined,
  })

  const handleIframeLoad = () => {
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

  const handleSkipIntro = () => {
    if (skipTime !== null) {
      sendCommand('seek', [skipTime])
    }
  }

  const handleNextEpisode = () => {
    if (mediaType !== 'tv') return
    sendCommand('play')
    setEpisode((prev) => prev + 1)
  }

  const handlePreviousEpisode = () => {
    if (mediaType !== 'tv') return
    setEpisode((prev) => Math.max(1, prev - 1))
  }

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      sendCommand('setMuted', [!prev])
      return !prev
    })
  }

  const handleQualityChange = (value: string) => {
    const q = value as Quality
    if (QUALITIES.includes(q)) {
      setQuality(q)
    }
  }

  const isTv = mediaType === 'tv'

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
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="no-referrer-when-downgrade"
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

              {skipTime !== null && playerReady && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/80 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                  <Button variant="ghost" size="sm" onClick={handleSkipIntro} disabled={skipTime === null}>
                    <SkipForward size={14} aria-hidden="true" />
                    Skip intro
                  </Button>
                  <p className="text-xs text-white">{skipTime}s</p>
                </div>
              )}

              {playerReady && (
                <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 bg-black/70 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
                  </Button>
                  <select
                    value={quality}
                    onChange={(e) => handleQualityChange(e.target.value)}
                    className="bg-black/60 text-white text-xs border border-white/20 rounded px-2 py-1 focus:outline-none focus:border-primary"
                    aria-label="Video quality"
                  >
                    {QUALITIES.map((q) => (
                      <option key={q} value={q}>
                        {q}p
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {isTv && playerReady && !playerError && (
          <div className="mt-4 flex justify-between items-center max-w-5xl mx-auto">
            <Button variant="ghost" size="sm" onClick={handlePreviousEpisode} disabled={episode <= 1}>
              <ChevronLeft size={16} aria-hidden="true" />
              Previous
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNextEpisode}>
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
        )}

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
