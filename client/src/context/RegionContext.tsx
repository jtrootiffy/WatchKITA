import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRegionsQuery } from '../lib/queries'
import type { Region } from '../types'

export const DEFAULT_REGION = 'PH'
const STORAGE_KEY = 'watchkita.region'

interface RegionContextValue {
  region: string
  regionName: string
  setRegion: (code: string) => void
  regions: Region[]
  isLoading: boolean
  isError: boolean
}

const RegionContext = createContext<RegionContextValue | undefined>(undefined)

function readStoredRegion(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && /^[A-Z]{2}$/.test(stored)) return stored
  } catch {
    // Storage can be unavailable in private mode; fall back to the default.
  }
  return DEFAULT_REGION
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<string>(readStoredRegion)
  const { data, isLoading, isError } = useRegionsQuery()
  const regions = data ?? []

  const setRegion = useCallback((code: string) => {
    if (!/^[A-Z]{2}$/.test(code)) return
    setRegionState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // Ignore storage failures; the selection still applies for this session.
    }
  }, [])

  // If a remembered region is no longer offered by the API, return to default.
  useEffect(() => {
    if (regions.length > 0 && !regions.some((item) => item.code === region)) {
      setRegion(DEFAULT_REGION)
    }
  }, [regions, region, setRegion])

  const regionName = useMemo(
    () => regions.find((item) => item.code === region)?.name ?? region,
    [regions, region],
  )

  const value = useMemo(
    () => ({ region, regionName, setRegion, regions, isLoading, isError }),
    [region, regionName, setRegion, regions, isLoading, isError],
  )

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
}

export function useRegion(): RegionContextValue {
  const context = useContext(RegionContext)
  if (!context) throw new Error('useRegion must be used within RegionProvider')
  return context
}
