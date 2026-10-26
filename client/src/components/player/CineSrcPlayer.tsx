import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Loader2,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  Maximize,
  Minimize,
} from 'lucide-react'
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
  currentTime?: number
  duration?: number
  volume?: number
  muted?: boolean
  command?: string
  result?: number | boolean
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
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [season, setSeason] = useState(initialSeason ?? 1)
  const [episode, setEpisode] = useState(initialEpisode ?? 1)
  const [isMuted, setIsMuted] = useState(false)
  const [quality, setQuality] = useState<Quality>('720')
  const [skipTime, setSkipTime] = useState<number | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
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
          // Sync the control bar with the player's current state.
          sendCommand('getPaused')
          sendCommand('getVolume')
          sendCommand('getMuted')
          sendCommand('getCurrentTime')
          sendCommand('getDuration')
          onReady?.()
          break
        }

        case 'cinesrc:play': {
          setIsPaused(false)
          break
        }

        case 'cinesrc:pause': {
          setIsPaused(true)
          break
        }

        case 'cinesrc:timeupdate':
        case 'cinesrc:seeking':
        case 'cinesrc:seeked': {
          if (typeof data.currentTime === 'number' && Number.isFinite(data.currentTime)) {
            setCurrentTime(data.currentTime)
          }
          if (typeof data.duration === 'number' && data.duration > 0) {
            setDuration(data.duration)
          }
          break
        }

        case 'cinesrc:loadedmetadata': {
          if (typeof data.duration === 'number' && data.duration > 0) {
            setDuration(data.duration)
          }
          break
        }

        case 'cinesrc:volumechange': {
          if (typeof data.volume === 'number' && Number.isFinite(data.volume)) {
            setVolume(Math.min(1, Math.max(0, data.volume)))
          }
          if (typeof data.muted === 'boolean') setIsMuted(data.muted)
          break
        }

        case 'cinesrc:response': {
          if (data.command === 'getPaused' && typeof data.result === 'boolean') {
            setIsPaused(data.result)
          }
          if (data.command === 'getVolume' && typeof data.result === 'number') {
            setVolume(Math.min(1, Math.max(0, data.result)))
          }
          if (data.command === 'getMuted' && typeof data.result === 'boolean') {
            setIsMuted(data.result)
          }
          if (data.command === 'getCurrentTime' && typeof data.result === 'number') {
            setCurrentTime(data.result)
          }
          if (data.command === 'getDuration' && typeof data.result === 'number' && data.result > 0) {
            setDuration(data.result)
          }
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
    [clearReadyTimeout, clearSkipTimeout, handleError, sendCommand, onReady, onEpisodeChange, onClose],
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
    // Mute and volume are driven through the player API below; keeping them out
    // of the embed URL avoids reloading the iframe on every volume change.
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

  const handleToggleMute = useCallback(() => {
    const next = !isMuted
    setIsMuted(next)
    sendCommand('setMuted', [next])
  }, [isMuted, sendCommand])

  const handleVolumeChange = useCallback(
    (next: number) => {
      const clamped = Math.min(1, Math.max(0, Number.isFinite(next) ? next : 0))
      setVolume(clamped)
      sendCommand('setVolume', [clamped])
      if (clamped > 0 && isMuted) {
        setIsMuted(false)
        sendCommand('setMuted', [false])
      }
    },
    [isMuted, sendCommand],
  )

  const handleTogglePlay = useCallback(() => {
    if (isPaused) sendCommand('play')
    else sendCommand('pause')
  }, [isPaused, sendCommand])

  const handleSeekBy = useCallback(
    (delta: number) => {
      const upper = duration > 0 ? duration : Number.POSITIVE_INFINITY
      const target = Math.min(upper, Math.max(0, currentTime + delta))
      setCurrentTime(target)
      sendCommand('seek', [target])
    },
    [currentTime, duration, sendCommand],
  )

  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return
    if (document.fullscreenElement) {
      void document.exitFullscreen?.()
      return
    }
    const frame = frameRef.current
    if (!frame?.requestFullscreen) return
    void frame.requestFullscreen().catch(() => {})
  }, [])

  const handleQualityChange = useCallback(
    (value: string) => {
      const q = value as Quality
      if (!QUALITIES.includes(q) || q === quality) return
      // Quality is an embed-URL preference, so switching it reloads the player.
      setQuality(q)
      setPlayerReady(false)
      setIsLoading(true)
    },
    [quality],
  )

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      // Never steal keys from form fields, or from a focused button/link.
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      if ((tag === 'BUTTON' || tag === 'A') && (event.key === ' ' || event.key === 'Enter')) return

      switch (event.key) {
        case ' ':
        case 'Spacebar': {
          event.preventDefault()
          handleTogglePlay()
          break
        }
        case 'f':
        case 'F': {
          event.preventDefault()
          handleToggleFullscreen()
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          handleVolumeChange(volume + 0.1)
          break
        }
        case 'ArrowDown': {
          event.preventDefault()
          handleVolumeChange(volume - 0.1)
          break
        }
        case 'ArrowRight': {
          event.preventDefault()
          handleSeekBy(10)
          break
        }
        case 'ArrowLeft': {
          event.preventDefault()
          handleSeekBy(-10)
          break
        }
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleTogglePlay, handleToggleFullscreen, handleVolumeChange, handleSeekBy, volume])

  const isTv = mediaType === 'tv'

  return (
    <section className="watch-player-section bg-bg">
      <div className="shell pt-4 pb-12 sm:pt-6 sm:pb-16 lg:pt-10 lg:pb-20">
        <div
          ref={frameRef}
          className="watch-player-frame relative aspect-video w-full overflow-hidden bg-black rounded-lg sm:rounded-xl shadow-2xl ring-1 ring-line/60"
        >
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

            </>
          )}
        </div>

        {!playerError && (
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-2.5 max-w-5xl mx-auto px-1 sm:px-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isTv ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 sm:h-9 sm:px-3 text-xs"
                    onClick={handlePreviousEpisode}
                    disabled={episode <= 1}
                  >
                    <ChevronLeft size={15} aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 sm:h-9 sm:px-3 text-xs"
                    onClick={handleNextEpisode}
                  >
                    Next
                    <ChevronRight size={15} aria-hidden="true" />
                  </Button>
                </>
              ) : null}
            </div>

            <div className="flex items-center flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={15} aria-hidden="true" />
                ) : (
                  <Volume2 size={15} aria-hidden="true" />
                )}
              </Button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(event) => handleVolumeChange(Number(event.target.value))}
                aria-label="Volume"
                className="h-1 w-14 cursor-pointer accent-primary sm:w-24 md:w-28"
              />
              <span className="hidden w-8 text-right text-[10px] tabular-nums text-muted xs:inline-block sm:w-9 sm:text-[11px]">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>

              <select
                value={quality}
                onChange={(event) => handleQualityChange(event.target.value)}
                aria-label="Video quality"
                className="h-8 border border-line bg-surface sm:bg-transparent px-1.5 text-[11px] sm:h-9 sm:px-2 sm:text-xs text-white focus:border-muted focus:outline-none rounded"
              >
                {QUALITIES.map((q) => (
                  <option key={q} value={q} className="bg-bg">
                    {q}p
                  </option>
                ))}
              </select>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                onClick={handleToggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize size={15} aria-hidden="true" />
                ) : (
                  <Maximize size={15} aria-hidden="true" />
                )}
              </Button>
            </div>
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
