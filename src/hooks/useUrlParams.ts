import { useCallback } from 'react'
import type { ReligionType } from '../types/facility'

interface UrlParams {
  type: ReligionType | 'all'
  region: string
  q: string
  lat: number | null
  lng: number | null
  zoom: number | null
}

export function useUrlParams() {
  const getParams = useCallback((): UrlParams => {
    const params = new URLSearchParams(window.location.search)
    return {
      type: (params.get('type') as ReligionType) || 'all',
      region: params.get('region') || '전체',
      q: params.get('q') || '',
      lat: params.get('lat') ? parseFloat(params.get('lat')!) : null,
      lng: params.get('lng') ? parseFloat(params.get('lng')!) : null,
      zoom: params.get('zoom') ? parseFloat(params.get('zoom')!) : null
    }
  }, [])

  const setParams = useCallback((params: Record<string, string | null>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    })
    window.history.replaceState({}, '', url.toString())
  }, [])

  return { getParams, setParams }
}
