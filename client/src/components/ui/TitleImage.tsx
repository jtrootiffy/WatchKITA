import { useEffect, useState } from 'react'
import { Film } from 'lucide-react'
import { initials } from '../../lib/format'

interface TitleImageProps {
  src: string | null | undefined
  alt: string
  title: string
  className?: string
  imageClassName?: string
  priority?: boolean
  loadingLabel?: string
}

export default function TitleImage({
  src,
  alt,
  title,
  className = '',
  imageClassName = '',
  priority = false,
  loadingLabel = 'Artwork unavailable',
}: TitleImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  // If there is no src, or the src is not a valid non-empty URL, show fallback
  const validSrc = typeof src === 'string' && src.length > 0 && !src.startsWith('data:') ? src : undefined

  if (!validSrc || failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} — artwork unavailable`}
        className={`flex flex-col items-center justify-center gap-2 border border-line bg-surface px-3 text-center ${className}`}
      >
        <Film size={18} className="text-accent" aria-hidden="true" />
        <span className="font-serif text-xl leading-none text-white/70">{initials(title)}</span>
        <span className="text-[9px] uppercase tracking-widest text-muted/70">{loadingLabel}</span>
      </div>
    )
  }

  return (
    <img
      src={validSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={imageClassName || `h-full w-full object-cover ${className}`}
    />
  )
}
