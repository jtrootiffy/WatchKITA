import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useRegion } from '../context/RegionContext'

interface RegionSelectorProps {
  className?: string
  align?: 'left' | 'right'
}

export default function RegionSelector({ className = '', align = 'right' }: RegionSelectorProps) {
  const { region, regionName, setRegion, regions, isLoading } = useRegion()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 30)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(focusTimer)
    }
  }, [open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return regions
    return regions.filter(
      (item) => item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term),
    )
  }, [query, regions])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Region: ${regionName}. Change region`}
        className="flex h-10 items-center gap-2 border border-line px-3 text-[11px] uppercase tracking-widest text-muted transition-colors hover:border-muted hover:text-white"
      >
        <span>{region}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          className={`absolute z-50 mt-2 w-72 border border-line bg-bg shadow-none ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
            <Search size={14} className="text-muted" aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search regions"
              aria-label="Search regions"
              className="w-full bg-transparent text-sm text-white placeholder:text-muted/70 focus:outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto py-1" role="listbox" aria-label="Available regions">
            {isLoading ? (
              <p className="px-3 py-4 text-xs text-muted">Loading regions…</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted">No matching region.</p>
            ) : (
              filtered.map((item) => {
                const selected = item.code === region
                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setRegion(item.code)
                      setOpen(false)
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-white"
                  >
                    <span className="truncate">
                      <span className="mr-2 text-[10px] uppercase tracking-widest text-muted/70">
                        {item.code}
                      </span>
                      {item.name}
                    </span>
                    {selected ? <Check size={14} className="shrink-0 text-primary" aria-hidden="true" /> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
