import { useState, useEffect, useRef, useCallback } from 'react'
import type { ReligiousFacility } from '../types/facility'

interface RegionIndex {
  [key: string]: {
    count: number
    size: number
    file: string
  }
}

// 지역별 중심 좌표 및 경계 (대략적인 bounding box)
const REGION_BOUNDS: Record<string, { minLng: number, maxLng: number, minLat: number, maxLat: number }> = {
  seoul: { minLng: 126.7, maxLng: 127.2, minLat: 37.4, maxLat: 37.7 },
  gyeonggi: { minLng: 126.3, maxLng: 127.8, minLat: 36.9, maxLat: 38.3 },
  incheon: { minLng: 126.3, maxLng: 126.8, minLat: 37.3, maxLat: 37.7 },
  busan: { minLng: 128.8, maxLng: 129.3, minLat: 35.0, maxLat: 35.4 },
  daegu: { minLng: 128.4, maxLng: 128.8, minLat: 35.7, maxLat: 36.0 },
  gwangju: { minLng: 126.7, maxLng: 127.0, minLat: 35.0, maxLat: 35.3 },
  daejeon: { minLng: 127.2, maxLng: 127.5, minLat: 36.2, maxLat: 36.5 },
  ulsan: { minLng: 129.0, maxLng: 129.5, minLat: 35.4, maxLat: 35.7 },
  sejong: { minLng: 127.0, maxLng: 127.4, minLat: 36.4, maxLat: 36.7 },
  gangwon: { minLng: 127.0, maxLng: 129.4, minLat: 37.0, maxLat: 38.6 },
  chungbuk: { minLng: 127.2, maxLng: 128.2, minLat: 36.4, maxLat: 37.2 },
  chungnam: { minLng: 126.0, maxLng: 127.3, minLat: 36.0, maxLat: 36.9 },
  jeonbuk: { minLng: 126.3, maxLng: 127.5, minLat: 35.3, maxLat: 36.2 },
  jeonnam: { minLng: 126.0, maxLng: 127.9, minLat: 34.0, maxLat: 35.2 },
  gyeongbuk: { minLng: 128.3, maxLng: 130.0, minLat: 35.6, maxLat: 37.1 },
  gyeongnam: { minLng: 127.5, maxLng: 129.0, minLat: 34.7, maxLat: 35.7 },
  jeju: { minLng: 126.1, maxLng: 127.0, minLat: 33.1, maxLat: 33.6 }
}

// 뷰포트와 지역이 겹치는지 확인
function isRegionInViewport(
  regionKey: string,
  viewBounds: { minLng: number, maxLng: number, minLat: number, maxLat: number }
): boolean {
  const region = REGION_BOUNDS[regionKey]
  if (!region) return false

  // 박스 충돌 검사
  return !(
    region.maxLng < viewBounds.minLng ||
    region.minLng > viewBounds.maxLng ||
    region.maxLat < viewBounds.minLat ||
    region.minLat > viewBounds.maxLat
  )
}

export function useRegionData() {
  const [facilities, setFacilities] = useState<ReligiousFacility[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadedRegions, setLoadedRegions] = useState<Set<string>>(new Set())
  const [regionIndex, setRegionIndex] = useState<RegionIndex | null>(null)

  const facilitiesRef = useRef<ReligiousFacility[]>([])
  const loadingRef = useRef<Set<string>>(new Set())

  // 인덱스 로드
  useEffect(() => {
    fetch('/data/regions-index.json')
      .then(res => res.json())
      .then(setRegionIndex)
      .catch(err => setError(err.message))
  }, [])

  // 초기 로딩: 서울 + 경기 (가장 많이 사용)
  useEffect(() => {
    if (!regionIndex) return

    const initialRegions = ['seoul', 'gyeonggi']
    Promise.all(
      initialRegions.map(region =>
        fetch(`/data/${regionIndex[region].file}`)
          .then(res => res.json())
          .then(data => ({ region, data }))
      )
    ).then(results => {
      const allData: ReligiousFacility[] = []
      const loaded = new Set<string>()

      results.forEach(({ region, data }) => {
        allData.push(...data)
        loaded.add(region)
      })

      facilitiesRef.current = allData
      setFacilities(allData)
      setLoadedRegions(loaded)
      setIsLoading(false)
    }).catch(err => {
      setError(err.message)
      setIsLoading(false)
    })
  }, [regionIndex])

  // 뷰포트 기반 지역 로딩
  const loadRegionsInViewport = useCallback((
    viewState: { longitude: number, latitude: number, zoom: number }
  ) => {
    if (!regionIndex || viewState.zoom < 8) return // 줌 레벨 8 이하에서는 추가 로딩 안함

    // 뷰포트 경계 계산 (대략적)
    const zoomFactor = Math.pow(2, 10 - viewState.zoom)
    const viewBounds = {
      minLng: viewState.longitude - zoomFactor,
      maxLng: viewState.longitude + zoomFactor,
      minLat: viewState.latitude - zoomFactor * 0.7,
      maxLat: viewState.latitude + zoomFactor * 0.7
    }

    // 뷰포트에 겹치는 미로딩 지역 찾기
    const regionsToLoad = Object.keys(regionIndex).filter(region =>
      !loadedRegions.has(region) &&
      !loadingRef.current.has(region) &&
      isRegionInViewport(region, viewBounds)
    )

    if (regionsToLoad.length === 0) return

    // 로딩 중 표시
    regionsToLoad.forEach(r => loadingRef.current.add(r))

    // 병렬 로딩
    Promise.all(
      regionsToLoad.map(region =>
        fetch(`/data/${regionIndex[region].file}`)
          .then(res => res.json())
          .then(data => ({ region, data }))
      )
    ).then(results => {
      const newData = [...facilitiesRef.current]

      results.forEach(({ region, data }) => {
        newData.push(...data)
        loadingRef.current.delete(region)
      })

      facilitiesRef.current = newData
      setFacilities(newData)
      setLoadedRegions(prev => {
        const next = new Set(prev)
        results.forEach(({ region }) => next.add(region))
        return next
      })
    }).catch(err => {
      console.error('Region loading failed:', err)
      regionsToLoad.forEach(r => loadingRef.current.delete(r))
    })
  }, [regionIndex, loadedRegions])

  // 전체 로딩 (검색 등에서 필요할 때)
  const loadAllRegions = useCallback(async () => {
    if (!regionIndex) return

    const unloadedRegions = Object.keys(regionIndex).filter(r => !loadedRegions.has(r))
    if (unloadedRegions.length === 0) return

    setIsLoading(true)

    try {
      const results = await Promise.all(
        unloadedRegions.map(region =>
          fetch(`/data/${regionIndex[region].file}`)
            .then(res => res.json())
            .then(data => ({ region, data }))
        )
      )

      const newData = [...facilitiesRef.current]
      results.forEach(({ data }) => newData.push(...data))

      facilitiesRef.current = newData
      setFacilities(newData)
      setLoadedRegions(new Set(Object.keys(regionIndex)))
    } catch (err) {
      console.error('Full loading failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [regionIndex, loadedRegions])

  return {
    facilities,
    isLoading,
    error,
    loadedRegions,
    loadRegionsInViewport,
    loadAllRegions,
    totalRegions: regionIndex ? Object.keys(regionIndex).length : 0
  }
}
