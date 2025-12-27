import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

import allReligiousData from './data/all-religious.json'
import sigunguBoundaries from './data/sigungu-boundaries.json'
import facilitySigunguMap from './data/facility-sigungu-map.json'
import youtubeChannels from './data/youtube-channels.json'


// URL 파라미터 관리 훅
function useUrlParams() {
  const getParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      type: params.get('type') as ReligionType || 'all',
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

// 로컬스토리지 훅
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch { return initialValue }
  })

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value
      window.localStorage.setItem(key, JSON.stringify(newValue))
      return newValue
    })
  }, [key])

  return [storedValue, setValue]
}

// 디바운스 훅
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

interface ReligiousFacility {
  id: string
  name: string
  type: 'church' | 'catholic' | 'temple' | 'cult'
  address: string
  roadAddress: string
  phone: string | null
  lat: number
  lng: number
  kakaoUrl: string
  category: string
  denomination: string | null
  isCult: boolean
  cultType: string | null
  region: string
  website: string | null
  serviceTime: string | null
  pastor: string | null
}

type ReligionType = 'all' | 'church' | 'catholic' | 'temple' | 'cult'

const RELIGION_CONFIG = {
  church: { icon: '⛪', label: '교회', color: '#6366F1' },
  catholic: { icon: '✝️', label: '성당', color: '#EC4899' },
  temple: { icon: '☸️', label: '사찰', color: '#10B981' },
  cult: { icon: '⚠️', label: '이단의심', color: '#F59E0B' }
}

// 지도 스타일 (일반/위성)
const MAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  satellite: {
    version: 8 as const,
    sources: {
      'satellite': {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri'
      }
    },
    layers: [{ id: 'satellite-layer', type: 'raster' as const, source: 'satellite', minzoom: 0, maxzoom: 19 }]
  }
}

// 초성 추출 함수
const CHO_HANGUL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const getChosung = (str: string): string => {
  return str.split('').map(char => {
    const code = char.charCodeAt(0) - 44032
    if (code >= 0 && code <= 11171) {
      return CHO_HANGUL[Math.floor(code / 588)]
    }
    return char
  }).join('')
}


// 지역명 매핑 (검색어 -> 실제 지역명)
const REGION_ALIASES: Record<string, string[]> = {
  '서울': ['서울시', '서울특별시', 'seoul'],
  '부산': ['부산시', '부산광역시', 'busan'],
  '대구': ['대구시', '대구광역시', 'daegu'],
  '인천': ['인천시', '인천광역시', 'incheon'],
  '광주': ['광주시', '광주광역시', 'gwangju'],
  '대전': ['대전시', '대전광역시', 'daejeon'],
  '울산': ['울산시', '울산광역시', 'ulsan'],
  '세종': ['세종시', '세종특별자치시', 'sejong'],
  '경기': ['경기도', 'gyeonggi'],
  '강원': ['강원도', '강원특별자치도', 'gangwon'],
  '충북': ['충청북도', '충북', 'chungbuk'],
  '충남': ['충청남도', '충남', 'chungnam'],
  '전북': ['전라북도', '전북', '전북특별자치도', 'jeonbuk'],
  '전남': ['전라남도', '전남', 'jeonnam'],
  '경북': ['경상북도', '경북', 'gyeongbuk'],
  '경남': ['경상남도', '경남', 'gyeongnam'],
  '제주': ['제주도', '제주특별자치도', 'jeju'],
}

// 동네/구 이름 목록 (주소에서 추출하여 검색 매칭용)
const extractDistrict = (address: string): string[] => {
  const districts: string[] = []
  // 시군구 추출 (예: 강남구, 수원시, 해운대구)
  const sigunguMatch = address.match(/([가-힣]+[시군구])/g)
  if (sigunguMatch) districts.push(...sigunguMatch)
  // 읍면동 추출
  const emdMatch = address.match(/([가-힣]+[읍면동])/g)
  if (emdMatch) districts.push(...emdMatch)
  return districts
}

// 이단 종파 정보 (출처: 이단대책협의회, 한국기독교이단상담소)
const CULT_INFO: Record<string, { name: string, source: string }> = {
  '하나님의교회': { name: '하나님의교회(안상홍증인회)', source: '한국기독교이단상담소' },
  '통일교': { name: '통일교(세계평화통일가정연합)', source: '이단대책협의회' },
  '신천지': { name: '신천지예수교증거장막성전', source: '이단대책협의회' },
  '안식교': { name: '제칠일안식일예수재림교', source: '한국기독교이단상담소' },
  'JMS': { name: 'JMS(기독교복음선교회)', source: '이단대책협의회' },
  '몰몬교': { name: '예수그리스도후기성도교회', source: '이단대책협의회' },
  '여호와의증인': { name: '여호와의증인(왕국회관)', source: '이단대책협의회' },
  '구원파': { name: '구원파(기독교복음침례회)', source: '이단대책협의회' },
  '만민중앙교회': { name: '만민중앙교회', source: '이단대책협의회' }
}

const REGIONS = ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

const DATA_UPDATE_DATE = '2024.12.14'

const isValidWebsite = (url: string | null): boolean => {
  if (!url) return false
  const invalidPatterns = ['policy.daum.net', 'policy.kakao.com', 'cs.kakao.com', 'cs.daum.net']
  return !invalidPatterns.some(pattern => url.includes(pattern))
}

const facilities: ReligiousFacility[] = allReligiousData as ReligiousFacility[]

// 미리 계산된 매핑 데이터 사용
const sigunguMapping = facilitySigunguMap as Record<string, string>

// 검색 인덱스 미리 생성 (성능 최적화)
interface SearchIndex {
  id: string
  name: string
  nameLower: string
  nameChosung: string
  address: string
  addressLower: string
  denomination: string
  denominationLower: string
  type: string
  region: string
  districts: string[]
  lat: number
  lng: number
}

const searchIndex: SearchIndex[] = facilities.map(f => ({
  id: f.id,
  name: f.name,
  nameLower: f.name.toLowerCase(),
  nameChosung: getChosung(f.name),
  address: f.roadAddress || f.address,
  addressLower: (f.roadAddress || f.address).toLowerCase(),
  denomination: f.denomination || '',
  denominationLower: (f.denomination || '').toLowerCase(),
  type: f.type,
  region: f.region,
  districts: extractDistrict(f.roadAddress || f.address),
  lat: f.lat,
  lng: f.lng
}))

// ID로 빠르게 찾기 위한 맵 (globalThis.Map 사용으로 react-map-gl의 Map과 구분)
const facilityMap: globalThis.Map<string, ReligiousFacility> = new globalThis.Map(facilities.map(f => [f.id, f]))

// 시군구별 시설 수 계산 (미리 계산된 매핑 사용)
function computeSigunguCounts(facilitiesList: ReligiousFacility[]) {
  const counts: Record<string, number> = {}

  // 모든 시군구 초기화
  for (const feature of (sigunguBoundaries as any).features) {
    counts[feature.properties.code] = 0
  }

  // 미리 계산된 매핑으로 빠르게 카운트
  for (const f of facilitiesList) {
    const sigunguCode = sigunguMapping[f.id]
    if (sigunguCode && counts[sigunguCode] !== undefined) {
      counts[sigunguCode]++
    }
  }

  return counts
}

// 간단한 중심점 계산
function getPolygonCenter(coordinates: number[][][][]): [number, number] {
  let sumLng = 0, sumLat = 0, count = 0
  for (const polygon of coordinates) {
    for (const ring of polygon) {
      for (const coord of ring) {
        sumLng += coord[0]
        sumLat += coord[1]
        count++
      }
    }
  }
  return count > 0 ? [sumLng / count, sumLat / count] : [127.5, 36.5]
}


// 키워드 하이라이트 함수
const highlightText = (text: string, query: string) => {
  if (!query || query.length < 2) return text
  const q = query.toLowerCase()
  const lowerText = text.toLowerCase()
  const idx = lowerText.indexOf(q)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function App() {
  const [selectedType, setSelectedType] = useState<ReligionType>('all')
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [popupFacility, setPopupFacility] = useState<ReligiousFacility | null>(null)
  const [hoveredSigungu, setHoveredSigungu] = useState<{ code: string, name: string, sido: string, count: number, lng: number, lat: number } | null>(null)
  const [listPage, setListPage] = useState(1)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [viewState, setViewState] = useState({
    longitude: 127.5,
    latitude: 36.5,
    zoom: 7
  })
  // UI 토글 상태 - 모바일에서는 기본으로 사이드바 닫기
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  })
  const [legendVisible, setLegendVisible] = useState(true)
  // 검색 결과 패널 상태
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchResultsPage, setSearchResultsPage] = useState(1)
  const mapRef = useRef<any>(null)
  const [satelliteMode, setSatelliteMode] = useState(false)
  const ITEMS_PER_PAGE = 20
  // 즐겨찾기 & 최근 본 시설
  const [favorites, setFavorites] = useLocalStorage<string[]>('favorites', [])
  const [recentViewed, setRecentViewed] = useLocalStorage<string[]>('recentViewed', [])
  const { getParams, setParams } = useUrlParams()

  // URL 파라미터 초기화
  useEffect(() => {
    const params = getParams()
    if (params.type !== 'all') setSelectedType(params.type)
    if (params.region !== '전체') setSelectedRegion(params.region)
    if (params.q) setSearchQuery(params.q)
    if (params.lat && params.lng) {
      setViewState(prev => ({
        ...prev,
        longitude: params.lng!,
        latitude: params.lat!,
        zoom: params.zoom || 14
      }))
    }
  }, [])

  // URL 파라미터 동기화
  useEffect(() => {
    setParams({
      type: selectedType !== 'all' ? selectedType : null,
      region: selectedRegion !== '전체' ? selectedRegion : null,
      q: searchQuery || null
    })
  }, [selectedType, selectedRegion, searchQuery, setParams])

  // 즐겨찾기 토글
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }, [setFavorites])

  // 최근 본 시설 추가
  const addToRecent = useCallback((id: string) => {
    setRecentViewed(prev => {
      const filtered = prev.filter(f => f !== id)
      return [id, ...filtered].slice(0, 20)
    })
  }, [setRecentViewed])

  // 팝업 열 때 최근 본 시설에 추가
  useEffect(() => {
    if (popupFacility) addToRecent(popupFacility.id)
  }, [popupFacility, addToRecent])

  // 즐겨찾기 시설 목록
  const favoriteFacilities = useMemo(() => 
    favorites.map(id => facilityMap.get(id)).filter(Boolean) as ReligiousFacility[]
  , [favorites])

  // 최근 본 시설 목록
  const recentFacilities = useMemo(() => 
    recentViewed.map(id => facilityMap.get(id)).filter(Boolean) as ReligiousFacility[]
  , [recentViewed])

  const SEARCH_RESULTS_PER_PAGE = 50

  // 디바운스된 검색어
  const debouncedSearchQuery = useDebounce(searchQuery, 150)

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  // 마커 아이콘 생성 함수
  const createMarkerIcons = useCallback(() => {
    const icons: Record<string, ImageData> = {}
    const size = 32

    // 교회 - 집 모양 (세모 지붕 + 네모 몸체)
    const churchCanvas = document.createElement('canvas')
    churchCanvas.width = size
    churchCanvas.height = size
    const churchCtx = churchCanvas.getContext('2d')!
    churchCtx.fillStyle = '#4F46E5'
    churchCtx.strokeStyle = '#ffffff'
    churchCtx.lineWidth = 2
    // 지붕 (삼각형)
    churchCtx.beginPath()
    churchCtx.moveTo(size/2, 3)
    churchCtx.lineTo(size - 4, 14)
    churchCtx.lineTo(4, 14)
    churchCtx.closePath()
    churchCtx.fill()
    churchCtx.stroke()
    // 몸체 (사각형)
    churchCtx.fillRect(7, 13, size - 14, size - 17)
    churchCtx.strokeRect(7, 13, size - 14, size - 17)
    icons['marker-church'] = churchCtx.getImageData(0, 0, size, size)

    // 성당 - 두꺼운 십자가 (세로4칸 가로3칸 느낌)
    const catholicCanvas = document.createElement('canvas')
    catholicCanvas.width = size
    catholicCanvas.height = size
    const catholicCtx = catholicCanvas.getContext('2d')!
    catholicCtx.fillStyle = '#DB2777'
    catholicCtx.strokeStyle = '#ffffff'
    catholicCtx.lineWidth = 2
    const u = size / 7 // unit
    // 세로 막대 (4칸 높이)
    catholicCtx.fillRect(size/2 - u, 2, u * 2, u * 5.5)
    // 가로 막대 (3칸 너비)
    catholicCtx.fillRect(size/2 - u * 1.8, u * 1.5, u * 3.6, u * 2)
    // 테두리
    catholicCtx.beginPath()
    catholicCtx.moveTo(size/2 - u, 2)
    catholicCtx.lineTo(size/2 + u, 2)
    catholicCtx.lineTo(size/2 + u, u * 1.5)
    catholicCtx.lineTo(size/2 + u * 1.8, u * 1.5)
    catholicCtx.lineTo(size/2 + u * 1.8, u * 3.5)
    catholicCtx.lineTo(size/2 + u, u * 3.5)
    catholicCtx.lineTo(size/2 + u, 2 + u * 5.5)
    catholicCtx.lineTo(size/2 - u, 2 + u * 5.5)
    catholicCtx.lineTo(size/2 - u, u * 3.5)
    catholicCtx.lineTo(size/2 - u * 1.8, u * 3.5)
    catholicCtx.lineTo(size/2 - u * 1.8, u * 1.5)
    catholicCtx.lineTo(size/2 - u, u * 1.5)
    catholicCtx.closePath()
    catholicCtx.stroke()
    icons['marker-catholic'] = catholicCtx.getImageData(0, 0, size, size)

    // 사찰 - 卍 기호
    const templeCanvas = document.createElement('canvas')
    templeCanvas.width = size
    templeCanvas.height = size
    const templeCtx = templeCanvas.getContext('2d')!
    templeCtx.fillStyle = '#059669'
    templeCtx.strokeStyle = '#ffffff'
    templeCtx.lineWidth = 2
    const t = 4 // 선 두께
    const m = 5 // 마진
    // 卍 그리기
    templeCtx.fillRect(m, size/2 - t/2, size - m*2, t) // 가로
    templeCtx.fillRect(size/2 - t/2, m, t, size - m*2) // 세로
    // 꺾임 (시계방향 卍)
    templeCtx.fillRect(m, m, t, size/2 - m - t/2) // 좌상 세로
    templeCtx.fillRect(size/2 + t/2, m, size/2 - m - t/2, t) // 우상 가로
    templeCtx.fillRect(size - m - t, size/2 + t/2, t, size/2 - m - t/2) // 우하 세로
    templeCtx.fillRect(m, size - m - t, size/2 - m - t/2, t) // 좌하 가로
    // 테두리
    templeCtx.strokeRect(m - 1, m - 1, size - m*2 + 2, size - m*2 + 2)
    icons['marker-temple'] = templeCtx.getImageData(0, 0, size, size)

    // 이단 - 삼각형 + 느낌표
    const cultCanvas = document.createElement('canvas')
    cultCanvas.width = size
    cultCanvas.height = size
    const cultCtx = cultCanvas.getContext('2d')!
    cultCtx.fillStyle = '#D97706'
    cultCtx.strokeStyle = '#ffffff'
    cultCtx.lineWidth = 2
    // 삼각형
    cultCtx.beginPath()
    cultCtx.moveTo(size/2, 3)
    cultCtx.lineTo(size - 4, size - 4)
    cultCtx.lineTo(4, size - 4)
    cultCtx.closePath()
    cultCtx.fill()
    cultCtx.stroke()
    // 느낌표
    cultCtx.fillStyle = '#ffffff'
    cultCtx.fillRect(size/2 - 2, 10, 4, 10)
    cultCtx.beginPath()
    cultCtx.arc(size/2, 24, 2.5, 0, Math.PI * 2)
    cultCtx.fill()
    icons['marker-cult'] = cultCtx.getImageData(0, 0, size, size)

    return icons
  }, [])

  // 맵 로드 핸들러 - 커스텀 아이콘 등록
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    const icons = createMarkerIcons()
    Object.entries(icons).forEach(([name, imageData]) => {
      map.addImage(name, imageData)
    })
  }, [createMarkerIcons])

  // 최적화된 검색 함수 (searchIndex 사용)
  const fastSearch = useCallback((idx: SearchIndex, query: string): { match: boolean, score: number, isLocationMatch: boolean } => {
    if (!query) return { match: true, score: 0, isLocationMatch: false }

    const q = query.toLowerCase().trim()
    const qChosung = getChosung(q)
    let score = 0
    let isLocationMatch = false

    // 1. 이름 정확 매칭 (가장 빠름 - 미리 계산된 lowercase 사용)
    if (idx.nameLower.includes(q)) score += 100

    // 2. 초성 검색 (미리 계산된 chosung 사용)
    if (qChosung.length >= 2 && idx.nameChosung.includes(qChosung)) score += 80

    // 3. 주소 매칭
    if (idx.addressLower.includes(q)) {
      score += 70
      isLocationMatch = true
    }

    // 4. 동네/구 매칭 (미리 추출된 districts 사용)
    for (const district of idx.districts) {
      if (district.includes(q) || q.includes(district.replace(/[시군구읍면동]$/, ''))) {
        score += 90
        isLocationMatch = true
        break
      }
    }

    // 5. 교단 매칭
    if (idx.denominationLower.includes(q)) score += 60

    // 6. 지역명 별칭 매칭 (빠른 검색용)
    for (const [region, aliases] of Object.entries(REGION_ALIASES)) {
      if (q === region.toLowerCase() || aliases.some(a => q === a.toLowerCase())) {
        if (idx.region?.includes(region) || idx.addressLower.includes(region.toLowerCase())) {
          score += 85
          isLocationMatch = true
          break
        }
      }
    }

    return { match: score > 0, score, isLocationMatch }
  }, [])

  const filteredFacilities = useMemo(() => {
    const query = debouncedSearchQuery.trim()

    // 검색어가 없고 필터도 기본값이면 전체 반환 (가장 빠름)
    if (!query && selectedType === 'all' && selectedRegion === '전체') {
      return facilities
    }

    // searchIndex를 사용한 빠른 필터링
    let results: { idx: SearchIndex, score: number, isLocationMatch: boolean }[] = []

    for (const idx of searchIndex) {
      // 타입 필터
      if (selectedType !== 'all' && idx.type !== selectedType) continue
      // 지역 필터
      if (selectedRegion !== '전체' && (!idx.region || !idx.region.includes(selectedRegion))) continue

      // 검색어 필터
      if (query) {
        const searchResult = fastSearch(idx, query)
        if (searchResult.match) {
          results.push({ idx, score: searchResult.score, isLocationMatch: searchResult.isLocationMatch })
        }
      } else {
        results.push({ idx, score: 0, isLocationMatch: false })
      }
    }

    // 검색어가 있으면 점수순 정렬
    if (query) {
      results.sort((a, b) => {
        if (a.isLocationMatch && !b.isLocationMatch) return -1
        if (!a.isLocationMatch && b.isLocationMatch) return 1
        return b.score - a.score
      })
    }

    // ID로 실제 facility 객체 조회 (facilityMap 사용으로 O(1))
    return results.map(r => facilityMap.get(r.idx.id)!).filter(Boolean)
  }, [selectedType, selectedRegion, debouncedSearchQuery, fastSearch])

  // 시군구별 시설 수 계산 (필터된 데이터 기준)
  const sigunguCounts = useMemo(() => {
    return computeSigunguCounts(filteredFacilities)
  }, [filteredFacilities])

  // choropleth geojson 데이터 생성
  const choroplethData = useMemo(() => {
    const maxCount = Math.max(...Object.values(sigunguCounts), 1)

    return {
      type: 'FeatureCollection' as const,
      features: (sigunguBoundaries as any).features.map((feature: any) => ({
        ...feature,
        properties: {
          ...feature.properties,
          count: sigunguCounts[feature.properties.code] || 0,
          density: (sigunguCounts[feature.properties.code] || 0) / maxCount
        }
      }))
    }
  }, [sigunguCounts])

  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredFacilities.map(f => ({
      type: 'Feature' as const,
      properties: { id: f.id, name: f.name, type: f.type, address: f.address, roadAddress: f.roadAddress, phone: f.phone, kakaoUrl: f.kakaoUrl, category: f.category, denomination: f.denomination, isCult: f.isCult, cultType: f.cultType, region: f.region, website: f.website, isFavorite: favorites.includes(f.id) ? 1 : 0 },
      geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] }
    }))
  }), [filteredFacilities, favorites])

  const paginatedList = useMemo(() => {
    const start = (listPage - 1) * ITEMS_PER_PAGE
    return filteredFacilities.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredFacilities, listPage])

  const totalPages = Math.ceil(filteredFacilities.length / ITEMS_PER_PAGE)

  const stats = useMemo(() => {
    const counts = { church: 0, catholic: 0, temple: 0, cult: 0 }
    filteredFacilities.forEach(f => { if (f.type in counts) counts[f.type]++ })
    return counts
  }, [filteredFacilities])


  

  // 공유하기
  const shareLocation = useCallback(async (facility: ReligiousFacility) => {
    const url = `${window.location.origin}?lat=${facility.lat}&lng=${facility.lng}&zoom=16`
    const text = `${facility.name} - ${facility.roadAddress || facility.address}`
    
    if (navigator.share) {
      try {
        await navigator.share({ title: facility.name, text, url })
      } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      alert('링크가 복사되었습니다!')
    }
  }, [])


  const handleMapClick = useCallback((e: any) => {
    const features = e.features
    if (!features || features.length === 0) {
      setPopupFacility(null)
      return
    }
    const feature = features[0]

    // 시군구 레이어 클릭 - 해당 구역으로 줌인
    if (feature.layer.id === 'sigungu-fill') {
      // 해당 시군구의 경계 박스 계산
      const geometry = feature.geometry
      if (geometry) {
        let minLng = Infinity, maxLng = -Infinity
        let minLat = Infinity, maxLat = -Infinity

        const processCoords = (coords: number[][]) => {
          coords.forEach(([lng, lat]) => {
            minLng = Math.min(minLng, lng)
            maxLng = Math.max(maxLng, lng)
            minLat = Math.min(minLat, lat)
            maxLat = Math.max(maxLat, lat)
          })
        }

        if (geometry.type === 'Polygon') {
          geometry.coordinates.forEach(processCoords)
        } else if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach((polygon: number[][][]) => polygon.forEach(processCoords))
        }

        // 경계 박스로 줌인만 수행 (검색 필터 적용 안함)
        mapRef.current?.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 50, duration: 1000 }
        )
      }
      return
    }

    if (feature.properties.cluster) {
      const clusterId = feature.properties.cluster_id
      const src = mapRef.current?.getSource('facilities')
      src?.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (!err) mapRef.current?.easeTo({ center: feature.geometry.coordinates, zoom })
      })
    } else {
      const props = feature.properties
      const [lng, lat] = feature.geometry.coordinates
      setPopupFacility({ id: props.id, name: props.name, type: props.type, address: props.address, roadAddress: props.roadAddress, phone: props.phone, lat, lng, kakaoUrl: props.kakaoUrl, category: props.category, denomination: props.denomination, isCult: props.isCult === 'true' || props.isCult === true, cultType: props.cultType, region: props.region, website: props.website, serviceTime: null, pastor: null })
    }
  }, [])

  // 마우스 이동 쓰로틀링을 위한 ref
  const lastMouseMoveTime = useRef(0)
  const handleMouseMove = useCallback((e: any) => {
    // 50ms 쓰로틀링으로 성능 개선
    const now = Date.now()
    if (now - lastMouseMoveTime.current < 50) return
    lastMouseMoveTime.current = now

    const features = e.features
    if (features && features.length > 0) {
      const feature = features.find((f: any) => f.layer.id === 'sigungu-fill')
      if (feature) {
        const { code, name, sido, count } = feature.properties
        // 같은 시군구면 업데이트 안함 (깜빡임 방지)
        setHoveredSigungu(prev => {
          if (prev && prev.code === code) return prev
          const center = getPolygonCenter(feature.geometry.coordinates)
          return { code, name, sido, count, lng: center[0], lat: center[1] }
        })
        return
      }
    }
    setHoveredSigungu(null)
  }, [])

  useEffect(() => setListPage(1), [selectedType, selectedRegion, debouncedSearchQuery])

  // 검색어 변경시 결과 패널 페이지 초기화
  useEffect(() => setSearchResultsPage(1), [debouncedSearchQuery])

  // Enter 키 핸들러 - 검색 결과 패널 표시 및 첫 번째 결과로 지도 이동
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowSearchResults(true)
      setSearchResultsPage(1)
      // 첫 번째 결과로 지도 이동
      if (filteredFacilities.length > 0) {
        const first = filteredFacilities[0]
        setViewState(prev => ({
          ...prev,
          longitude: first.lng,
          latitude: first.lat,
          zoom: 14
        }))
      }
    }
  }, [searchQuery, filteredFacilities])

  // 검색 결과 패널 닫기
  const closeSearchResults = useCallback(() => {
    setShowSearchResults(false)
  }, [])

  // 검색 결과 클릭시 해당 위치로 이동
  const handleSearchResultClick = useCallback((facility: ReligiousFacility) => {
    setViewState(prev => ({
      ...prev,
      longitude: facility.lng,
      latitude: facility.lat,
      zoom: 16
    }))
    setPopupFacility(facility)
  }, [])

  // 검색 결과 패널용 페이지네이션
  const paginatedSearchResults = useMemo(() => {
    const start = (searchResultsPage - 1) * SEARCH_RESULTS_PER_PAGE
    return filteredFacilities.slice(start, start + SEARCH_RESULTS_PER_PAGE)
  }, [filteredFacilities, searchResultsPage])

  const totalSearchPages = Math.ceil(filteredFacilities.length / SEARCH_RESULTS_PER_PAGE)

  const mapStyle = satelliteMode
    ? MAP_STYLES.satellite
    : (darkMode ? MAP_STYLES.dark : MAP_STYLES.light)

  // choropleth 레이어 (시군구별 색상 채우기) - 줌 12 이하에서만 표시
  const sigunguFillLayer: any = {
    id: 'sigungu-fill',
    type: 'fill',
    source: 'sigungu',
    maxzoom: 12,
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'count'],
        0, 'rgba(240, 249, 255, 0.4)',
        10, 'rgba(224, 242, 254, 0.5)',
        50, 'rgba(186, 230, 253, 0.55)',
        100, 'rgba(125, 211, 252, 0.6)',
        200, 'rgba(56, 189, 248, 0.6)',
        500, 'rgba(14, 165, 233, 0.65)',
        1000, 'rgba(2, 132, 199, 0.7)',
        2000, 'rgba(3, 105, 161, 0.75)'
      ],
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 0.6,
        12, 0.2
      ]
    }
  }

  // 경계선 레이어 - 줌 12 이하에서만 표시
  const sigunguLineLayer: any = {
    id: 'sigungu-line',
    type: 'line',
    source: 'sigungu',
    maxzoom: 12,
    paint: {
      'line-color': darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(100, 116, 139, 0.25)',
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 0.2,
        10, 0.5,
        12, 0.3
      ],
      'line-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 1,
        12, 0.3
      ]
    }
  }

  // 호버된 시군구 강조 레이어 - filter로 최적화
  const sigunguHoverLayer: any = useMemo(() => ({
    id: 'sigungu-hover',
    type: 'fill',
    source: 'sigungu',
    maxzoom: 12,
    filter: hoveredSigungu ? ['==', ['get', 'code'], hoveredSigungu.code] : ['==', 1, 0],
    paint: {
      'fill-color': '#3B82F6',
      'fill-opacity': 0.4
    }
  }), [hoveredSigungu?.code])

  // 호버된 시군구 경계선 강조
  const sigunguHoverLineLayer: any = useMemo(() => ({
    id: 'sigungu-hover-line',
    type: 'line',
    source: 'sigungu',
    maxzoom: 12,
    filter: hoveredSigungu ? ['==', ['get', 'code'], hoveredSigungu.code] : ['==', 1, 0],
    paint: {
      'line-color': '#2563EB',
      'line-width': 3
    }
  }), [hoveredSigungu?.code])

  // 마커 레이어 - 종류별 다른 아이콘 사용
  const markerLayer: any = {
    id: 'marker-point',
    type: 'symbol',
    source: 'facilities',
    minzoom: 10,
    layout: {
      'icon-image': ['match', ['get', 'type'],
        'church', 'marker-church',
        'catholic', 'marker-catholic',
        'temple', 'marker-temple',
        'cult', 'marker-cult',
        'marker-church'
      ],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 14, 0.9, 18, 1.2],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  }

  // 즐겨찾기 테두리 레이어 (금색 원)
  const favoriteRingLayer: any = {
    id: 'favorite-ring',
    type: 'circle',
    source: 'facilities',
    filter: ['==', ['get', 'isFavorite'], 1],
    minzoom: 10,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 14, 18, 20],
      'circle-color': 'transparent',
      'circle-stroke-width': 3,
      'circle-stroke-color': '#FFD700'
    }
  }

  // 시설 이름 레이어 (줌 14 이상)
  const facilityLabelLayer: any = {
    id: 'facility-label',
    type: 'symbol',
    source: 'facilities',
    minzoom: 14,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
      'text-optional': true,
      'text-max-width': 10
    },
    paint: {
      'text-color': darkMode ? '#e2e8f0' : '#334155',
      'text-halo-color': darkMode ? '#1e293b' : '#ffffff',
      'text-halo-width': 1.5
    }
  }

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🙏</span>
            <div className="logo-text">
              <h1>종교시설 찾기</h1>
              <span className="update-date">업데이트: {DATA_UPDATE_DATE}</span>
            </div>
          </div>
          <div className="header-right">
            <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} title={darkMode ? '라이트 모드' : '다크 모드'}>{darkMode ? '☀️' : '🌙'}</button>
            <span className="total-count">{facilities.length.toLocaleString()}개 시설</span>
          </div>
        </div>
      </header>

      <div className="main-container">
        {/* 사이드바 토글 버튼 (접힌 상태에서 표시) */}
        {sidebarCollapsed && (
          <button className="sidebar-toggle collapsed" onClick={() => setSidebarCollapsed(false)} title="검색 패널 열기">
            <span>☰</span>
          </button>
        )}

        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <h2>🔍 검색</h2>
            <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(true)} title="검색 패널 접기">
              ✕
            </button>
          </div>

          {/* 통합 검색창 */}
          <div className="filter-section search-main">
            <div className="search-box large">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="교회명, 동네, 주소, 교단 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="search-input"
              />
              {searchQuery && <button className="clear-btn" onClick={() => { setSearchQuery(''); setShowSearchResults(false) }}>×</button>}
            </div>
            <div className="search-hints">
              <span>예: 강남, ㅅㅊㅈ, 침례교, 해운대 (Enter로 검색)</span>
            </div>
          </div>

          <div className="filter-section">
            <h3>종교 유형</h3>
            <div className="type-filters">
              {Object.entries(RELIGION_CONFIG).map(([type, config]) => (
                <button key={type} className={`type-btn ${selectedType === type ? 'active' : ''}`} onClick={() => setSelectedType(selectedType === type ? 'all' : type as ReligionType)} style={{ '--type-color': config.color } as React.CSSProperties}>
                  <span className="type-icon">{config.icon}</span>
                  <span className="type-label">{config.label}</span>
                  <span className="type-count">{stats[type as keyof typeof stats].toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>지역 바로가기</h3>
            <div className="region-chips">
              {REGIONS.map(region => (
                <button
                  key={region}
                  className={`region-chip ${selectedRegion === region ? 'active' : ''}`}
                  onClick={() => setSelectedRegion(region)}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section results">
            <div className="results-count">검색 결과: <strong>{filteredFacilities.length.toLocaleString()}</strong>개</div>
          </div>

          <div className="view-toggle">
            <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>🗺️ 지도</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>📋 목록</button>
          </div>

          {/* 즐겨찾기 섹션 */}
          {favoriteFacilities.length > 0 && (
            <div className="filter-section favorites-section">
              <h3>⭐ 즐겨찾기 ({favoriteFacilities.length})</h3>
              <div className="favorites-list">
                {favoriteFacilities.slice(0, 5).map(facility => (
                  <div
                    key={facility.id}
                    className="favorite-item"
                    onClick={() => handleSearchResultClick(facility)}
                  >
                    <span className="favorite-icon" style={{ background: RELIGION_CONFIG[facility.type]?.color }}>
                      {RELIGION_CONFIG[facility.type]?.icon}
                    </span>
                    <div className="favorite-info">
                      <span className="favorite-name">{facility.name}</span>
                      <span className="favorite-address">{facility.roadAddress || facility.address}</span>
                    </div>
                    <button
                      className="favorite-remove"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(facility.id); }}
                      title="즐겨찾기 해제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {favoriteFacilities.length > 5 && (
                  <div className="favorites-more">+{favoriteFacilities.length - 5}개 더보기</div>
                )}
              </div>
            </div>
          )}

          {/* 최근 본 시설 섹션 */}
          {recentFacilities.length > 0 && (
            <div className="filter-section recent-section">
              <h3>🕐 최근 본 시설</h3>
              <div className="recent-list">
                {recentFacilities.slice(0, 5).map(facility => (
                  <div
                    key={facility.id}
                    className="recent-item"
                    onClick={() => handleSearchResultClick(facility)}
                  >
                    <span className="recent-icon" style={{ background: RELIGION_CONFIG[facility.type]?.color }}>
                      {RELIGION_CONFIG[facility.type]?.icon}
                    </span>
                    <div className="recent-info">
                      <span className="recent-name">{facility.name}</span>
                      <span className="recent-type">{RELIGION_CONFIG[facility.type]?.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AdSense 광고 배너 */}
          <div className="ad-banner sidebar-ad">
            <div className="ad-placeholder">
              <span className="ad-label">광고</span>
              <span className="ad-text">AdSense 연동 후 표시됩니다</span>
              {/* 실제 AdSense 코드는 아래와 같이 추가 */}
              {/* <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-YOUR_ID"
                data-ad-slot="YOUR_SLOT"
                data-ad-format="auto"
                data-full-width-responsive="true"
              /> */}
            </div>
          </div>
        </aside>

        {/* 검색 결과 패널 */}
        {showSearchResults && viewMode === 'map' && (
          <aside className="search-results-panel">
            <div className="search-results-header">
              <h3>검색 결과</h3>
              <span className="search-results-count">{filteredFacilities.length.toLocaleString()}개</span>
              <button className="search-results-close" onClick={closeSearchResults}>✕</button>
            </div>
            <div className="search-results-list">
              {paginatedSearchResults.map(facility => (
                <div
                  key={facility.id}
                  className="search-result-item"
                  onClick={() => handleSearchResultClick(facility)}
                >
                  <div className="search-result-header">
                    <span className="search-result-icon" style={{ background: RELIGION_CONFIG[facility.type]?.color }}>
                      {RELIGION_CONFIG[facility.type]?.icon}
                    </span>
                    <div className="search-result-title">
                      <h4>{highlightText(facility.name, searchQuery)}</h4>
                      <span className="search-result-type">{RELIGION_CONFIG[facility.type]?.label}</span>
                    </div>
                  </div>
                  <p className="search-result-address">
                    {highlightText(facility.roadAddress || facility.address, searchQuery)}
                  </p>
                  {facility.denomination && (
                    <p className="search-result-denomination">
                      {highlightText(facility.denomination, searchQuery)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {totalSearchPages > 1 && (
              <div className="search-results-pagination">
                <button onClick={() => setSearchResultsPage(p => Math.max(1, p - 1))} disabled={searchResultsPage === 1}>◀</button>
                <span>{searchResultsPage} / {totalSearchPages}</span>
                <button onClick={() => setSearchResultsPage(p => Math.min(totalSearchPages, p + 1))} disabled={searchResultsPage === totalSearchPages}>▶</button>
              </div>
            )}
          </aside>
        )}

        <main className="content">
          {viewMode === 'map' ? (
            <div className="map-container" onClick={() => { if (selectedType !== 'all') setSelectedType('all') }}>
              <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                onLoad={handleMapLoad}
                style={{ width: '100%', height: '100%' }}
                mapStyle={mapStyle}
                interactiveLayerIds={['sigungu-fill', 'marker-point']}
                onClick={handleMapClick}
                onMouseMove={handleMouseMove}
              >
                <NavigationControl position="top-right" />

                {/* 위성 모드 토글 버튼 */}
                <div className="satellite-toggle-container">
                  <button
                    className={`satellite-toggle ${satelliteMode ? 'active' : ''}`}
                    onClick={() => setSatelliteMode(!satelliteMode)}
                    title={satelliteMode ? '일반 지도' : '위성 사진'}
                  >
                    {satelliteMode ? '🗺️' : '🛰️'}
                  </button>
                </div>

                {/* 시군구 경계 choropleth */}
                <Source id="sigungu" type="geojson" data={choroplethData}>
                  <Layer {...sigunguFillLayer} />
                  <Layer {...sigunguLineLayer} />
                  <Layer {...sigunguHoverLayer} />
                  <Layer {...sigunguHoverLineLayer} />
                </Source>

                {/* 개별 시설 포인트 */}
                <Source id="facilities" type="geojson" data={geojsonData} cluster={false}>
                  <Layer {...favoriteRingLayer} />
                  <Layer {...markerLayer} />
                  <Layer {...facilityLabelLayer} />
                </Source>

                {/* 시군구 hover 툴팁 */}
                {hoveredSigungu && (
                  <Popup
                    longitude={hoveredSigungu.lng}
                    latitude={hoveredSigungu.lat}
                    anchor="bottom"
                    closeButton={false}
                    closeOnClick={false}
                    className="sigungu-popup"
                  >
                    <div className="sigungu-tooltip">
                      <div className="sigungu-name">{hoveredSigungu.sido} {hoveredSigungu.name}</div>
                      <div className="sigungu-count">{hoveredSigungu.count.toLocaleString()}개 시설</div>
                    </div>
                  </Popup>
                )}

                {popupFacility && (
                  <Popup longitude={popupFacility.lng} latitude={popupFacility.lat} anchor="bottom" onClose={() => setPopupFacility(null)} closeButton closeOnClick={false} maxWidth="320px" className="full-popup">
                    <div className="popup-full">
                      <div className="popup-header">
                        <span className="popup-type-badge" style={{ background: RELIGION_CONFIG[popupFacility.type]?.color || '#888' }}>{RELIGION_CONFIG[popupFacility.type]?.icon} {RELIGION_CONFIG[popupFacility.type]?.label}</span>
                        {popupFacility.isCult && popupFacility.cultType && (
                          <span className="popup-cult-badge" title={CULT_INFO[popupFacility.cultType]?.source || '이단대책협의회'}>
                            ⚠️ {CULT_INFO[popupFacility.cultType]?.name || popupFacility.cultType}
                          </span>
                        )}
                      </div>
                      <h3 className="popup-name">{popupFacility.name}</h3>
                      {popupFacility.denomination && <p className="popup-denomination">{popupFacility.denomination}</p>}
                      <div className="popup-info">
                        <div className="popup-info-row"><span className="popup-info-icon">📍</span><span>{popupFacility.roadAddress || popupFacility.address}</span></div>
                        {popupFacility.phone && <div className="popup-info-row"><span className="popup-info-icon">📞</span><a href={`tel:${popupFacility.phone}`} className="popup-phone-link">{popupFacility.phone}</a></div>}
                      </div>
                      <div className="popup-actions-top">
                        <button
                          className={`popup-btn favorite ${favorites.includes(popupFacility.id) ? 'active' : ''}`}
                          onClick={() => toggleFavorite(popupFacility.id)}
                          title={favorites.includes(popupFacility.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        >
                          {favorites.includes(popupFacility.id) ? '★' : '☆'} 즐겨찾기
                        </button>
                        <button className="popup-btn share" onClick={() => shareLocation(popupFacility)} title="공유하기">
                          📤 공유
                        </button>
                      </div>
                      <div className="popup-nav-buttons">
                        <a href={popupFacility.kakaoUrl || `https://place.map.kakao.com/${popupFacility.id}`} target="_blank" rel="noopener noreferrer" className="popup-btn nav kakao" title="카카오맵에서 보기">
                          🗺️ 카카오
                        </a>
                        <a href={`https://map.naver.com/p/search/${encodeURIComponent(popupFacility.name + ' ' + (popupFacility.roadAddress || popupFacility.address))}`} target="_blank" rel="noopener noreferrer" className="popup-btn nav naver" title="네이버지도에서 보기">
                          🗺️ 네이버
                        </a>
                        <a href={`https://map.kakao.com/link/roadview/${popupFacility.lat},${popupFacility.lng}`} target="_blank" rel="noopener noreferrer" className="popup-btn nav roadview" title="로드뷰 보기">
                          👁️ 로드뷰
                        </a>
                        {(youtubeChannels as Record<string, string>)[popupFacility.id] && (
                          <a href={(youtubeChannels as Record<string, string>)[popupFacility.id]} target="_blank" rel="noopener noreferrer" className="popup-btn nav youtube" title="YouTube 채널">
                            ▶️ YouTube
                          </a>
                        )}
                      </div>
                      <div className="popup-actions">
                        {isValidWebsite(popupFacility.website) && popupFacility.website && <a href={popupFacility.website.startsWith('http') ? popupFacility.website : `https://${popupFacility.website}`} target="_blank" rel="noopener noreferrer" className="popup-btn website">🌐 웹사이트</a>}
                        {popupFacility.phone && <a href={`tel:${popupFacility.phone}`} className="popup-btn call">📞 전화</a>}
                      </div>
                    </div>
                  </Popup>
                )}
              </Map>
              <div className={`map-legend glass ${legendVisible ? '' : 'collapsed'}`}>
                <div className="legend-header" onClick={() => setLegendVisible(!legendVisible)}>
                  <span className="legend-icon">📊</span>
                  <span className="legend-title">시설 분포</span>
                  <span className="legend-toggle">{legendVisible ? '▼' : '▲'}</span>
                </div>
                {legendVisible && (
                  <>
                    <div className="legend-section">
                      <div className="legend-section-title">시군구별 밀집도</div>
                      <div className="choropleth-legend">
                        <div className="choropleth-bar"></div>
                        <div className="choropleth-labels">
                          <span>0</span>
                          <span>500</span>
                          <span>1000+</span>
                        </div>
                      </div>
                    </div>
                    <div className="legend-divider"></div>
                    <div className="legend-section">
                      <div className="legend-section-title">시설 유형</div>
                      <div className="legend-types">
                        <div className="type-item"><span className="type-dot" style={{ background: '#6366F1' }}></span><span>교회</span></div>
                        <div className="type-item"><span className="type-dot" style={{ background: '#EC4899' }}></span><span>성당</span></div>
                        <div className="type-item"><span className="type-dot" style={{ background: '#10B981' }}></span><span>사찰</span></div>
                        <div className="type-item"><span className="type-dot" style={{ background: '#F59E0B' }}></span><span>이단의심</span></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="list-container">
              <div className="facility-grid">
                {paginatedList.map(facility => (
                  <div key={facility.id} className="facility-card" onClick={() => setPopupFacility(facility)}>
                    <div className="card-header">
                      <span className="card-icon" style={{ background: RELIGION_CONFIG[facility.type]?.color || '#888' }}>{RELIGION_CONFIG[facility.type]?.icon}</span>
                      <div className="card-title"><h4>{facility.name}</h4><span className="card-type">{RELIGION_CONFIG[facility.type]?.label}</span></div>
                      {isValidWebsite(facility.website) && <span className="has-website">🌐</span>}
                    </div>
                    <p className="card-address">{facility.roadAddress || facility.address}</p>
                    {facility.phone && <p className="card-phone">📞 {facility.phone}</p>}
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setListPage(1)} disabled={listPage === 1}>⟪</button>
                  <button onClick={() => setListPage(p => Math.max(1, p - 1))} disabled={listPage === 1}>◀</button>
                  <span className="page-info">{listPage} / {totalPages}</span>
                  <button onClick={() => setListPage(p => Math.min(totalPages, p + 1))} disabled={listPage === totalPages}>▶</button>
                  <button onClick={() => setListPage(totalPages)} disabled={listPage === totalPages}>⟫</button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {viewMode === 'list' && popupFacility && (
        <div className="modal-overlay" onClick={() => setPopupFacility(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPopupFacility(null)}>×</button>
            <div className="modal-header">
              <span className="modal-icon" style={{ background: RELIGION_CONFIG[popupFacility.type]?.color || '#888' }}>{RELIGION_CONFIG[popupFacility.type]?.icon}</span>
              <div className="modal-title"><h2>{popupFacility.name}</h2><span className="modal-type">{RELIGION_CONFIG[popupFacility.type]?.label}{popupFacility.denomination && ` · ${popupFacility.denomination}`}</span></div>
            </div>
            {popupFacility.isCult && popupFacility.cultType && (
              <div className="cult-warning">
                ⚠️ {CULT_INFO[popupFacility.cultType]?.name || popupFacility.cultType}
                <span className="cult-source">(출처: {CULT_INFO[popupFacility.cultType]?.source || '이단대책협의회'})</span>
              </div>
            )}
            <div className="modal-body">
              <div className="info-row"><span className="info-icon">📍</span><div className="info-content"><span className="info-label">주소</span><span className="info-value">{popupFacility.roadAddress || popupFacility.address}</span></div></div>
              {popupFacility.phone && <div className="info-row"><span className="info-icon">📞</span><div className="info-content"><span className="info-label">연락처</span><span className="info-value">{popupFacility.phone}</span></div></div>}
              {popupFacility.category && <div className="info-row"><span className="info-icon">📂</span><div className="info-content"><span className="info-label">분류</span><span className="info-value">{popupFacility.category}</span></div></div>}
            </div>
            <div className="modal-actions">
              <a href={popupFacility.kakaoUrl || `https://map.kakao.com/link/search/${encodeURIComponent(popupFacility.name)}`} target="_blank" rel="noopener noreferrer" className="action-btn kakao">🗺️ 카카오맵</a>
              {isValidWebsite(popupFacility.website) && popupFacility.website && <a href={popupFacility.website.startsWith('http') ? popupFacility.website : `https://${popupFacility.website}`} target="_blank" rel="noopener noreferrer" className="action-btn website">🌐 웹사이트</a>}
              {popupFacility.phone && <a href={`tel:${popupFacility.phone}`} className="action-btn call">📞 전화</a>}
              <a href={`https://map.naver.com/v5/search/${encodeURIComponent(popupFacility.roadAddress || popupFacility.address)}`} target="_blank" rel="noopener noreferrer" className="action-btn naver">🗺️ 네이버맵</a>
              {(youtubeChannels as Record<string, string>)[popupFacility.id] && (
                <a href={(youtubeChannels as Record<string, string>)[popupFacility.id]} target="_blank" rel="noopener noreferrer" className="action-btn youtube">▶️ YouTube</a>
              )}
            </div>
            <div className="modal-footer"><span className="data-source">출처: 카카오맵 · 업데이트: {DATA_UPDATE_DATE}</span></div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>데이터 출처: <a href="https://map.kakao.com" target="_blank" rel="noopener noreferrer">카카오맵</a> · 업데이트: {DATA_UPDATE_DATE} · 총 {facilities.length.toLocaleString()}개 시설</p>
      </footer>
    </div>
  )
}

export default App
