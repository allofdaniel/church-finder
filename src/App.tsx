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

type ReligionType = 'church' | 'catholic' | 'temple' | 'cult'
type FacilityTypeSet = Set<ReligionType>

const RELIGION_CONFIG: Record<ReligionType, { icon: string, label: string, color: string }> = {
  church: { icon: '⛪', label: '교회', color: '#6366F1' },
  catholic: { icon: '✝️', label: '성당', color: '#EC4899' },
  temple: { icon: '☸️', label: '사찰', color: '#10B981' },
  cult: { icon: '⚠️', label: '이단의심', color: '#F59E0B' }
}

// 지역별 중심좌표와 줌 레벨
const REGION_COORDS: Record<string, { center: [number, number], zoom: number }> = {
  '전체': { center: [127.5, 36.5], zoom: 7 },
  '서울': { center: [126.978, 37.566], zoom: 11 },
  '부산': { center: [129.075, 35.179], zoom: 11 },
  '대구': { center: [128.601, 35.871], zoom: 11 },
  '인천': { center: [126.705, 37.456], zoom: 11 },
  '광주': { center: [126.851, 35.160], zoom: 11 },
  '대전': { center: [127.384, 36.350], zoom: 11 },
  '울산': { center: [129.311, 35.539], zoom: 11 },
  '세종': { center: [127.289, 36.480], zoom: 11 },
  '경기': { center: [127.009, 37.275], zoom: 9 },
  '강원': { center: [128.209, 37.555], zoom: 9 },
  '충북': { center: [127.929, 36.628], zoom: 9 },
  '충남': { center: [126.800, 36.518], zoom: 9 },
  '전북': { center: [127.108, 35.716], zoom: 9 },
  '전남': { center: [126.991, 34.816], zoom: 9 },
  '경북': { center: [128.888, 36.249], zoom: 9 },
  '경남': { center: [128.249, 35.238], zoom: 9 },
  '제주': { center: [126.545, 33.379], zoom: 10 }
}

// Google API Key
const GOOGLE_API_KEY = 'AIzaSyAz38gk_qzDIQqf3I7lCCnWjtqD9VNykYI'

// 주소 검색 결과 타입
interface GeocodingResult {
  name: string
  address: string
  lat: number
  lng: number
  type: 'address' | 'facility'
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

// 지역명 -> GeoJSON 파일 매핑
const REGION_TO_GEOJSON: Record<string, string> = {
  '서울': '/geojson/seoul.geojson',
  '서울시': '/geojson/seoul.geojson',
  '서울특별시': '/geojson/seoul.geojson',
  '부산': '/geojson/busan.geojson',
  '부산시': '/geojson/busan.geojson',
  '부산광역시': '/geojson/busan.geojson',
  '대구': '/geojson/daegu.geojson',
  '대구시': '/geojson/daegu.geojson',
  '대구광역시': '/geojson/daegu.geojson',
  '인천': '/geojson/incheon.geojson',
  '인천시': '/geojson/incheon.geojson',
  '인천광역시': '/geojson/incheon.geojson',
  '광주': '/geojson/gwangju.geojson',
  '광주시': '/geojson/gwangju.geojson',
  '광주광역시': '/geojson/gwangju.geojson',
  '대전': '/geojson/daejeon.geojson',
  '대전시': '/geojson/daejeon.geojson',
  '대전광역시': '/geojson/daejeon.geojson',
  '울산': '/geojson/ulsan.geojson',
  '울산시': '/geojson/ulsan.geojson',
  '울산광역시': '/geojson/ulsan.geojson',
  '세종': '/geojson/sejong.geojson',
  '세종시': '/geojson/sejong.geojson',
  '세종특별자치시': '/geojson/sejong.geojson',
  '경기': '/geojson/gyeonggi.geojson',
  '경기도': '/geojson/gyeonggi.geojson',
  '강원': '/geojson/gangwon.geojson',
  '강원도': '/geojson/gangwon.geojson',
  '강원특별자치도': '/geojson/gangwon.geojson',
  '충북': '/geojson/chungbuk.geojson',
  '충청북도': '/geojson/chungbuk.geojson',
  '충남': '/geojson/chungnam.geojson',
  '충청남도': '/geojson/chungnam.geojson',
  '전북': '/geojson/jeonbuk.geojson',
  '전라북도': '/geojson/jeonbuk.geojson',
  '전북특별자치도': '/geojson/jeonbuk.geojson',
  '전남': '/geojson/jeonnam.geojson',
  '전라남도': '/geojson/jeonnam.geojson',
  '경북': '/geojson/gyeongbuk.geojson',
  '경상북도': '/geojson/gyeongbuk.geojson',
  '경남': '/geojson/gyeongnam.geojson',
  '경상남도': '/geojson/gyeongnam.geojson',
  '제주': '/geojson/jeju.geojson',
  '제주도': '/geojson/jeju.geojson',
  '제주특별자치도': '/geojson/jeju.geojson'
}

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

// 시도별 시설 수 합산 계산
function computeSidoCounts(sigunguCounts: Record<string, number>) {
  const sidoCounts: Record<string, number> = {}

  for (const feature of (sigunguBoundaries as any).features) {
    const sido = feature.properties.sido
    const count = sigunguCounts[feature.properties.code] || 0
    sidoCounts[sido] = (sidoCounts[sido] || 0) + count
  }

  return sidoCounts
}


// 간단한 중심점 계산 - Polygon과 MultiPolygon 모두 처리
function getPolygonCenter(coordinates: any): [number, number] {
  if (!coordinates || !Array.isArray(coordinates)) return [127.5, 36.5]

  let sumLng = 0, sumLat = 0, count = 0

  const processCoord = (coord: any) => {
    if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number') {
      sumLng += coord[0]
      sumLat += coord[1]
      count++
    } else if (Array.isArray(coord)) {
      coord.forEach(processCoord)
    }
  }

  processCoord(coordinates)
  return count > 0 ? [sumLng / count, sumLat / count] : [127.5, 36.5]
}

// 시도별 중심점 계산 (미리 계산)
const sidoCenters: Record<string, [number, number]> = {}
const sidoFeatures: Record<string, any[]> = {}

for (const feature of (sigunguBoundaries as any).features) {
  const sido = feature.properties.sido
  if (!sidoFeatures[sido]) sidoFeatures[sido] = []
  sidoFeatures[sido].push(feature)
}

for (const [sido, features] of Object.entries(sidoFeatures)) {
  let sumLng = 0, sumLat = 0, count = 0
  for (const f of features) {
    const center = getPolygonCenter(f.geometry.coordinates)
    sumLng += center[0]
    sumLat += center[1]
    count++
  }
  sidoCenters[sido] = count > 0 ? [sumLng / count, sumLat / count] : [127.5, 36.5]
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
  // 다중 선택 가능한 시설 유형 (기본: 모두 선택)
  const [selectedTypes, setSelectedTypes] = useState<FacilityTypeSet>(() => new Set(['church', 'catholic', 'temple', 'cult']))
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [popupFacility, setPopupFacility] = useState<ReligiousFacility | null>(null)
  const [hoveredSigungu, setHoveredSigungu] = useState<{ code: string, name: string, sido: string, count: number, lng: number, lat: number } | null>(null)
  const [selectedSido, setSelectedSido] = useState<string | null>(null)
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [legendVisible, setLegendVisible] = useState(true)
  // 바텀시트 상태 (collapsed: 접힘, peek: 미리보기, expanded: 확장)
  const [bottomSheetState, setBottomSheetState] = useState<'collapsed' | 'peek' | 'expanded'>('collapsed')
  // 검색 자동완성 상태
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchResultsPage, setSearchResultsPage] = useState(1)
  // 필터 드롭다운 상태
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  // 스트리트뷰 모달 상태 (expanded: 전체화면, half: 하단 반)
  const [streetViewModal, setStreetViewModal] = useState<{ lat: number, lng: number, name: string, expanded: boolean } | null>(null)
  // 주소 검색 결과 (지오코딩)
  const [addressResults, setAddressResults] = useState<GeocodingResult[]>([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  // 검색된 지역 경계 GeoJSON
  const [regionBoundary, setRegionBoundary] = useState<any>(null)
  const [regionBoundaryLoading, setRegionBoundaryLoading] = useState(false)
  const mapRef = useRef<any>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [satelliteMode, setSatelliteMode] = useState(false)
  const ITEMS_PER_PAGE = 20
  // 즐겨찾기 & 최근 본 시설
  const [favorites, setFavorites] = useLocalStorage<string[]>('favorites', [])
  const [recentViewed, setRecentViewed] = useLocalStorage<string[]>('recentViewed', [])
  const { getParams, setParams } = useUrlParams()

  // URL 파라미터 초기화
  useEffect(() => {
    const params = getParams()
    if (params.type && ['church', 'catholic', 'temple', 'cult'].includes(params.type)) {
      setSelectedTypes(new Set([params.type as ReligionType]))
    }
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
    const typesArray = Array.from(selectedTypes)
    setParams({
      type: typesArray.length === 1 ? typesArray[0] : null,
      region: selectedRegion !== '전체' ? selectedRegion : null,
      q: searchQuery || null
    })
  }, [selectedTypes, selectedRegion, searchQuery, setParams])

  // 시설 유형 토글 함수
  const toggleType = useCallback((type: ReligionType) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        // 최소 1개는 선택되어 있어야 함
        if (newSet.size > 1) {
          newSet.delete(type)
        }
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }, [])

  // 전체 선택/해제
  const toggleAllTypes = useCallback(() => {
    setSelectedTypes(prev => {
      if (prev.size === 4) {
        // 모두 선택된 상태면 교회만 선택
        return new Set(['church'])
      } else {
        // 아니면 모두 선택
        return new Set(['church', 'catholic', 'temple', 'cult'])
      }
    })
  }, [])

  // 지역 선택 및 지도 이동
  const selectRegion = useCallback((region: string) => {
    setSelectedRegion(region)
    setShowRegionDropdown(false)
    setSidebarCollapsed(true)

    const coords = REGION_COORDS[region]
    if (coords) {
      setViewState(prev => ({
        ...prev,
        longitude: coords.center[0],
        latitude: coords.center[1],
        zoom: coords.zoom
      }))
    }
  }, [])

  // Google Geocoding API로 주소 검색
  const searchAddress = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setAddressResults([])
      return
    }

    setIsSearchingAddress(true)
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ' 대한민국')}&key=${GOOGLE_API_KEY}&language=ko&region=kr`
      )
      const data = await response.json()

      if (data.status === 'OK' && data.results) {
        const results: GeocodingResult[] = data.results.slice(0, 5).map((result: any) => ({
          name: result.formatted_address.replace(/, 대한민국$/, '').replace(/대한민국 /, ''),
          address: result.formatted_address,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          type: 'address' as const
        }))
        setAddressResults(results)
      } else {
        setAddressResults([])
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      setAddressResults([])
    } finally {
      setIsSearchingAddress(false)
    }
  }, [])

  // 주소 검색 결과 선택시 해당 위치로 이동
  const handleAddressSelect = useCallback((result: GeocodingResult) => {
    setViewState(prev => ({
      ...prev,
      longitude: result.lng,
      latitude: result.lat,
      zoom: 15
    }))
    setShowSuggestions(false)
    setAddressResults([])
    setSearchQuery(result.name)
  }, [])

  // 검색어에서 지역 경계선 검색 및 표시
  const searchRegionBoundary = useCallback(async (query: string) => {
    if (!query.trim()) {
      setRegionBoundary(null)
      return
    }

    // 검색어에서 지역명 추출 시도
    const q = query.trim()

    // 1. 시도명 직접 매칭
    const geojsonPath = REGION_TO_GEOJSON[q]
    if (geojsonPath) {
      setRegionBoundaryLoading(true)
      try {
        const response = await fetch(geojsonPath)
        if (response.ok) {
          const geojsonData = await response.json()
          setRegionBoundary(geojsonData)

          // 해당 지역으로 줌인
          if (geojsonData.features && geojsonData.features.length > 0) {
            let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
            geojsonData.features.forEach((feature: any) => {
              const processCoords = (coords: any) => {
                if (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number') {
                  minLng = Math.min(minLng, coords[0])
                  maxLng = Math.max(maxLng, coords[0])
                  minLat = Math.min(minLat, coords[1])
                  maxLat = Math.max(maxLat, coords[1])
                } else if (Array.isArray(coords)) {
                  coords.forEach(processCoords)
                }
              }
              processCoords(feature.geometry.coordinates)
            })

            if (minLng !== Infinity) {
              mapRef.current?.fitBounds(
                [[minLng, minLat], [maxLng, maxLat]],
                { padding: 50, duration: 1000 }
              )
            }
          }
        }
      } catch (error) {
        console.error('Failed to load region boundary:', error)
      } finally {
        setRegionBoundaryLoading(false)
      }
      return
    }

    // 2. 구/군/동 등 세부 지역명 검색
    // 어떤 시도에 속하는지 찾아서 해당 GeoJSON에서 필터링
    const districtPatterns = [
      /(.+)[구군읍면동리]$/,  // 강남구, 수원시, 판교동 등
      /(.+시)$/              // 수원시, 성남시 등
    ]

    for (const pattern of districtPatterns) {
      const match = q.match(pattern)
      if (match) {
        // 모든 지역 GeoJSON에서 검색
        const allRegions = [
          'seoul', 'busan', 'daegu', 'incheon', 'gwangju', 'daejeon',
          'ulsan', 'sejong', 'gyeonggi', 'gangwon', 'chungbuk', 'chungnam',
          'jeonbuk', 'jeonnam', 'gyeongbuk', 'gyeongnam', 'jeju'
        ]

        setRegionBoundaryLoading(true)

        for (const region of allRegions) {
          try {
            const response = await fetch(`/geojson/${region}.geojson`)
            if (response.ok) {
              const geojsonData = await response.json()

              // 해당 지역 이름이 포함된 feature 찾기
              const matchedFeatures = geojsonData.features.filter((feature: any) => {
                const admNm = feature.properties.adm_nm || ''
                const sggNm = feature.properties.sggnm || ''
                return admNm.includes(q) || sggNm.includes(q) ||
                       admNm.includes(match[1]) || sggNm.includes(match[1])
              })

              if (matchedFeatures.length > 0) {
                const filteredGeoJSON = {
                  type: 'FeatureCollection',
                  features: matchedFeatures
                }
                setRegionBoundary(filteredGeoJSON)

                // 해당 지역으로 줌인
                let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
                matchedFeatures.forEach((feature: any) => {
                  const processCoords = (coords: any) => {
                    if (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number') {
                      minLng = Math.min(minLng, coords[0])
                      maxLng = Math.max(maxLng, coords[0])
                      minLat = Math.min(minLat, coords[1])
                      maxLat = Math.max(maxLat, coords[1])
                    } else if (Array.isArray(coords)) {
                      coords.forEach(processCoords)
                    }
                  }
                  processCoords(feature.geometry.coordinates)
                })

                if (minLng !== Infinity) {
                  mapRef.current?.fitBounds(
                    [[minLng, minLat], [maxLng, maxLat]],
                    { padding: 50, duration: 1000 }
                  )
                }

                setRegionBoundaryLoading(false)
                return
              }
            }
          } catch {}
        }
        setRegionBoundaryLoading(false)
        break
      }
    }
  }, [])

  // 키워드 하이라이트 함수
  const highlightKeyword = useCallback((text: string, keyword: string) => {
    if (!keyword.trim()) return text
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="highlight">{part}</mark> : part
    )
  }, [])

  // 스트리트뷰 열기 (기본: 하단 절반)
  const openStreetView = useCallback((lat: number, lng: number, name: string) => {
    setStreetViewModal({ lat, lng, name, expanded: false })
  }, [])

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

  // 주소 패턴 감지하여 지오코딩 실행
  useEffect(() => {
    const query = debouncedSearchQuery.trim()
    // 주소 패턴: 시/군/구/동/읍/면/리 또는 숫자 포함
    const isAddressPattern = /[시군구동읍면리로길]/.test(query) || /\d+/.test(query)

    if (isAddressPattern && query.length >= 2) {
      searchAddress(query)
    } else {
      setAddressResults([])
    }
  }, [debouncedSearchQuery, searchAddress])

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  // 맵 로드 핸들러 - 커스텀 아이콘 로드
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // 아이콘 이미지 로드
    const icons = [
      { id: 'church-icon', url: '/icons/church.svg' },
      { id: 'catholic-icon', url: '/icons/catholic.svg' },
      { id: 'temple-icon', url: '/icons/temple.svg' },
      { id: 'cult-icon', url: '/icons/cult.svg' }
    ]

    icons.forEach(({ id, url }) => {
      if (!map.hasImage(id)) {
        const img = new Image(48, 48)
        img.onload = () => {
          if (!map.hasImage(id)) {
            map.addImage(id, img, { sdf: false })
          }
        }
        img.src = url
      }
    })
  }, [])

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
    if (!query && selectedTypes.size === 4 && selectedRegion === '전체') {
      return facilities
    }

    // searchIndex를 사용한 빠른 필터링
    let results: { idx: SearchIndex, score: number, isLocationMatch: boolean }[] = []

    for (const idx of searchIndex) {
      // 타입 필터 (Set 사용)
      if (!selectedTypes.has(idx.type as ReligionType)) continue
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
  }, [selectedTypes, selectedRegion, debouncedSearchQuery, fastSearch])

  // 시군구별 시설 수 계산 (필터된 데이터 기준)
  const sigunguCounts = useMemo(() => {
    return computeSigunguCounts(filteredFacilities)
  }, [filteredFacilities])

  // 시도별 시설 수 합산 계산
  const sidoCounts = useMemo(() => {
    return computeSidoCounts(sigunguCounts)
  }, [sigunguCounts])

  // 시도별 라벨 데이터 (줌 레벨 8 이하)
  const sidoLabelData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: Object.entries(sidoCounts)
        .filter(([_, count]) => count > 0)
        .map(([sido, count]) => ({
          type: 'Feature' as const,
          properties: {
            sido,
            count,
            countLabel: count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)
          },
          geometry: {
            type: 'Point' as const,
            coordinates: sidoCenters[sido] || [127.5, 36.5]
          }
        }))
    }
  }, [sidoCounts])

  // 뷰포트 내 시설 수 계산
  const viewportFacilityCount = useMemo(() => {
    if (viewState.zoom < 10) return Infinity  // 줌 10 미만에서는 마커 표시 안함

    // 뷰포트 경계 계산 (근사값)
    const latRange = 180 / Math.pow(2, viewState.zoom)
    const lngRange = 360 / Math.pow(2, viewState.zoom)

    const minLat = viewState.latitude - latRange
    const maxLat = viewState.latitude + latRange
    const minLng = viewState.longitude - lngRange
    const maxLng = viewState.longitude + lngRange

    return filteredFacilities.filter(f =>
      f.lat >= minLat && f.lat <= maxLat &&
      f.lng >= minLng && f.lng <= maxLng
    ).length
  }, [filteredFacilities, viewState.latitude, viewState.longitude, viewState.zoom])

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

  // 시군구 중심점에 숫자 표시를 위한 데이터
  const sigunguLabelData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: (sigunguBoundaries as any).features.map((feature: any) => {
        const center = getPolygonCenter(feature.geometry.coordinates)
        const count = sigunguCounts[feature.properties.code] || 0
        return {
          type: 'Feature' as const,
          properties: {
            code: feature.properties.code,
            name: feature.properties.name,
            count: count,
            countLabel: count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)
          },
          geometry: {
            type: 'Point' as const,
            coordinates: center
          }
        }
      }).filter((f: any) => f.properties.count > 0)  // 0개인 지역은 숨김
    }
  }, [sigunguCounts])

  // 모든 필터된 시설을 GeoJSON으로 변환 (클러스터링 없이 직접 표시)
  const geojsonData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: filteredFacilities.map(f => ({
        type: 'Feature' as const,
        properties: { id: f.id, name: f.name, type: f.type, address: f.address, roadAddress: f.roadAddress, phone: f.phone, kakaoUrl: f.kakaoUrl, category: f.category, denomination: f.denomination, isCult: f.isCult, cultType: f.cultType, region: f.region, website: f.website, isFavorite: favorites.includes(f.id) ? 1 : 0 },
        geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] }
      }))
    }
  }, [filteredFacilities, favorites])

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

    // 시군구 레이어 클릭 - 해당 시도 선택 및 줌인
    if (feature.layer.id === 'sido-fill') {
      const clickedSido = feature.properties?.sido

      // 같은 시도 다시 클릭하면 선택 해제
      if (selectedSido === clickedSido) {
        setSelectedSido(null)
      } else {
        setSelectedSido(clickedSido)
      }

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

    // 개별 마커 클릭 - 팝업 표시
    if (feature.layer.id === 'facility-markers') {
      const props = feature.properties
      const [lng, lat] = feature.geometry.coordinates
      setPopupFacility({ id: props.id, name: props.name, type: props.type, address: props.address, roadAddress: props.roadAddress, phone: props.phone, lat, lng, kakaoUrl: props.kakaoUrl, category: props.category, denomination: props.denomination, isCult: props.isCult === 'true' || props.isCult === true, cultType: props.cultType, region: props.region, website: props.website, serviceTime: null, pastor: null })
    }
  }, [selectedSido])

  // 모바일 감지
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // 드래그 상태 추적
  const isDragging = useRef(false)

  // 마우스 이동 쓰로틀링을 위한 ref
  const lastMouseMoveTime = useRef(0)
  const handleMouseMove = useCallback((e: any) => {
    // 모바일 또는 드래그 중에는 hover 기능 비활성화
    if (isMobile || isDragging.current) return

    // 100ms 쓰로틀링으로 성능 개선
    const now = Date.now()
    if (now - lastMouseMoveTime.current < 100) return
    lastMouseMoveTime.current = now

    try {
      const features = e.features
      if (features && features.length > 0) {
        const feature = features.find((f: any) => f.layer?.id === 'sido-fill')
        if (feature?.geometry?.coordinates && feature?.properties) {
          const { code, name, sido, count } = feature.properties
          setHoveredSigungu(prev => {
            if (prev && prev.code === code) return prev
            const center = getPolygonCenter(feature.geometry.coordinates)
            return { code, name, sido, count, lng: center[0], lat: center[1] }
          })
          return
        }
      }
      setHoveredSigungu(null)
    } catch {
      // 에러 발생시 무시
    }
  }, [isMobile])

  // 드래그 시작/종료 핸들러
  const handleDragStart = useCallback(() => {
    isDragging.current = true
    setHoveredSigungu(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => setListPage(1), [selectedTypes, selectedRegion, debouncedSearchQuery])

  // 검색어 변경시 결과 패널 페이지 초기화 및 경계선 초기화
  useEffect(() => {
    setSearchResultsPage(1)
    // 검색어가 비었으면 경계선 숨기기
    if (!debouncedSearchQuery.trim()) {
      setRegionBoundary(null)
    }
  }, [debouncedSearchQuery])

  // Enter 키 핸들러 - 검색 결과 첫 번째로 지도 이동 + 지역 경계선 검색
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowSuggestions(false)
      setBottomSheetState('peek')
      setSearchResultsPage(1)

      // 지역 경계선 검색 (지역명 검색인 경우)
      searchRegionBoundary(searchQuery.trim())

      // 첫 번째 결과로 지도 이동 (경계선 검색이 없는 경우)
      if (filteredFacilities.length > 0 && !REGION_TO_GEOJSON[searchQuery.trim()]) {
        const first = filteredFacilities[0]
        setViewState(prev => ({
          ...prev,
          longitude: first.lng,
          latitude: first.lat,
          zoom: 14
        }))
      }
    }
  }, [searchQuery, filteredFacilities, searchRegionBoundary])

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

  // 시도별 색상 맵
  const SIDO_COLORS: Record<string, string> = {
    '서울': '#EF4444',
    '부산': '#F97316',
    '대구': '#F59E0B',
    '인천': '#84CC16',
    '광주': '#22C55E',
    '대전': '#14B8A6',
    '울산': '#06B6D4',
    '세종': '#0EA5E9',
    '경기': '#3B82F6',
    '강원': '#6366F1',
    '충북': '#8B5CF6',
    '충남': '#A855F7',
    '전북': '#D946EF',
    '전남': '#EC4899',
    '경북': '#F43F5E',
    '경남': '#FB7185',
    '제주': '#FDA4AF'
  }

  // 시도별 배경색 레이어 - 선택된 시도만 강조 (줌 10 이하에서만 표시)
  const sidoFillLayer: any = {
    id: 'sido-fill',
    type: 'fill',
    source: 'sigungu',
    maxzoom: 10,  // 줌 10 이상 확대하면 음영 숨김
    paint: {
      'fill-color': selectedSido
        ? ['case',
            ['==', ['get', 'sido'], selectedSido],
            ['match', ['get', 'sido'],
              '서울', SIDO_COLORS['서울'],
              '부산', SIDO_COLORS['부산'],
              '대구', SIDO_COLORS['대구'],
              '인천', SIDO_COLORS['인천'],
              '광주', SIDO_COLORS['광주'],
              '대전', SIDO_COLORS['대전'],
              '울산', SIDO_COLORS['울산'],
              '세종', SIDO_COLORS['세종'],
              '경기', SIDO_COLORS['경기'],
              '강원', SIDO_COLORS['강원'],
              '충북', SIDO_COLORS['충북'],
              '충남', SIDO_COLORS['충남'],
              '전북', SIDO_COLORS['전북'],
              '전남', SIDO_COLORS['전남'],
              '경북', SIDO_COLORS['경북'],
              '경남', SIDO_COLORS['경남'],
              '제주', SIDO_COLORS['제주'],
              '#94A3B8'
            ],
            darkMode ? '#374151' : '#D1D5DB'
          ]
        : ['match', ['get', 'sido'],
            '서울', SIDO_COLORS['서울'],
            '부산', SIDO_COLORS['부산'],
            '대구', SIDO_COLORS['대구'],
            '인천', SIDO_COLORS['인천'],
            '광주', SIDO_COLORS['광주'],
            '대전', SIDO_COLORS['대전'],
            '울산', SIDO_COLORS['울산'],
            '세종', SIDO_COLORS['세종'],
            '경기', SIDO_COLORS['경기'],
            '강원', SIDO_COLORS['강원'],
            '충북', SIDO_COLORS['충북'],
            '충남', SIDO_COLORS['충남'],
            '전북', SIDO_COLORS['전북'],
            '전남', SIDO_COLORS['전남'],
            '경북', SIDO_COLORS['경북'],
            '경남', SIDO_COLORS['경남'],
            '제주', SIDO_COLORS['제주'],
            '#94A3B8'
          ],
      'fill-opacity': selectedSido
        ? ['case',
            ['==', ['get', 'sido'], selectedSido],
            0.7,
            0.2
          ]
        : [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0.5,
            8, 0.45,
            10, 0.4,
            12, 0.35,
            14, 0.3
          ]
    }
  }

  // 시군구 경계선 레이어 - 연한 선으로 구분 (줌 10 이하에서만 표시)
  const sigunguLineLayer: any = {
    id: 'sigungu-line',
    type: 'line',
    source: 'sigungu',
    maxzoom: 10,  // 줌 10 이상 확대하면 경계선 숨김
    paint: {
      'line-color': darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(100, 100, 100, 0.3)',
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 0.3,
        8, 0.5,
        10, 0.8,
        12, 0.6,
        14, 0.4
      ],
      'line-opacity': 0.5
    }
  }

  // 시도 라벨 레이어 - 줌 8 이하에서만 표시 (지역명 + 숫자)
  const sidoLabelLayer: any = {
    id: 'sido-labels',
    type: 'symbol',
    source: 'sido-labels',
    maxzoom: 8,
    layout: {
      'text-field': ['concat', ['get', 'sido'], '\n', ['get', 'countLabel']],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 12,
        7, 16,
        8, 18
      ],
      'text-line-height': 1.3,
      'text-allow-overlap': true,
      'text-anchor': 'center'
    },
    paint: {
      'text-color': '#FFFFFF',
      'text-halo-color': 'rgba(0, 0, 0, 0.8)',
      'text-halo-width': 2
    }
  }

  // 시군구 라벨 레이어 - 줌 8~13에서 표시 (지역명 + 숫자)
  const sigunguLabelLayer: any = {
    id: 'sigungu-labels',
    type: 'symbol',
    source: 'sigungu-labels',
    minzoom: 8,
    maxzoom: 13,
    layout: {
      'text-field': ['concat', ['get', 'name'], '\n', ['get', 'countLabel']],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, 10,
        10, 12,
        12, 14
      ],
      'text-line-height': 1.2,
      'text-allow-overlap': false,
      'text-anchor': 'center'
    },
    paint: {
      'text-color': '#FFFFFF',
      'text-halo-color': 'rgba(0, 0, 0, 0.7)',
      'text-halo-width': 1.5
    }
  }

  // 시설 마커 레이어 - 줌 10 이상에서만 표시 (SVG 아이콘 사용, 즐겨찾기는 더 크게)
  const facilityMarkerLayer: any = {
    id: 'facility-markers',
    type: 'symbol',
    source: 'facilities',
    minzoom: 10,
    layout: {
      'icon-image': ['match', ['get', 'type'],
        'church', 'church-icon',
        'catholic', 'catholic-icon',
        'temple', 'temple-icon',
        'cult', 'cult-icon',
        'church-icon'
      ],
      'icon-size': [
        'case',
        ['==', ['get', 'isFavorite'], 1],
        // 즐겨찾기 시설은 1.5배 크기
        ['interpolate', ['linear'], ['zoom'],
          10, 0.6,
          12, 0.75,
          14, 1.05,
          16, 1.35,
          18, 1.65
        ],
        // 일반 시설
        ['interpolate', ['linear'], ['zoom'],
          10, 0.4,
          12, 0.5,
          14, 0.7,
          16, 0.9,
          18, 1.1
        ]
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': false,
      // 즐겨찾기 시설 먼저 정렬 (위에 표시)
      'symbol-sort-key': ['case', ['==', ['get', 'isFavorite'], 1], 0, 1]
    }
  }

  // 시설 라벨 레이어 - 확대 시 이름 + 유형 표시 (즐겨찾기에 별표 추가)
  const facilityLabelLayer: any = {
    id: 'facility-labels',
    type: 'symbol',
    source: 'facilities',
    minzoom: 12,
    layout: {
      'text-field': ['concat',
        // 즐겨찾기면 별표 추가
        ['case', ['==', ['get', 'isFavorite'], 1], '★ ', ''],
        ['match', ['get', 'type'],
          'church', '⛪ ',
          'catholic', '✝️ ',
          'temple', '☸️ ',
          'cult', '⚠️ ',
          ''
        ],
        ['get', 'name']
      ],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 16, 12, 18, 14],
      'text-offset': [0, 1.8],
      'text-anchor': 'top',
      'text-max-width': 10,
      'text-allow-overlap': false,
      // 즐겨찾기 시설 먼저 정렬
      'symbol-sort-key': ['case', ['==', ['get', 'isFavorite'], 1], 0, 1]
    },
    paint: {
      'text-color': ['case',
        ['==', ['get', 'isFavorite'], 1],
        '#F59E0B',  // 즐겨찾기는 황금색
        darkMode ? '#FFFFFF' : '#1F2937'
      ],
      'text-halo-color': darkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
      'text-halo-width': 2
    }
  }

  return (
    <div className={`app kakao-style ${darkMode ? 'dark' : ''}`}>
      {/* 상단 검색바 - 카카오맵 스타일 */}
      <header className="search-header">
        <button className="menu-btn" onClick={() => setSidebarCollapsed(false)} title="메뉴">
          <span className="menu-icon">☰</span>
        </button>
        <div className="search-bar-wrapper">
          <div className="search-bar">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="장소, 주소 검색"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(e.target.value.length > 0)
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchQuery) setShowSuggestions(true)
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => { setSearchQuery(''); setShowSuggestions(false); setBottomSheetState('collapsed'); }}>×</button>
            )}
          </div>
          {/* 검색 자동완성 드롭다운 */}
          {showSuggestions && searchQuery && (filteredFacilities.length > 0 || addressResults.length > 0) && (
            <div className="search-suggestions">
              {/* 주소 검색 결과 (Google Geocoding) */}
              {addressResults.length > 0 && (
                <>
                  <div className="suggestion-section-header">
                    <span className="section-icon">📍</span> 주소 검색 결과
                    {isSearchingAddress && <span className="loading-spinner" />}
                  </div>
                  {addressResults.map((result, idx) => (
                    <div
                      key={`addr-${idx}`}
                      className="suggestion-item address-item"
                      onClick={() => handleAddressSelect(result)}
                    >
                      <span className="suggestion-icon address-icon">📍</span>
                      <div className="suggestion-info">
                        <span className="suggestion-name">{highlightKeyword(result.name, searchQuery)}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {/* 시설 검색 결과 */}
              {filteredFacilities.length > 0 && (
                <>
                  {addressResults.length > 0 && (
                    <div className="suggestion-section-header">
                      <span className="section-icon">🏛️</span> 시설 검색 결과
                    </div>
                  )}
                  {filteredFacilities.slice(0, 8).map(facility => (
                    <div
                      key={facility.id}
                      className="suggestion-item"
                      onClick={() => {
                        handleSearchResultClick(facility)
                        setShowSuggestions(false)
                        setSearchQuery(facility.name)
                      }}
                    >
                      <span className="suggestion-icon" style={{ color: RELIGION_CONFIG[facility.type]?.color }}>
                        {RELIGION_CONFIG[facility.type]?.icon}
                      </span>
                      <div className="suggestion-info">
                        <span className="suggestion-name">{highlightKeyword(facility.name, searchQuery)}</span>
                        <span className="suggestion-address">{highlightKeyword(facility.address, searchQuery)}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <button className="header-action" onClick={() => setDarkMode(!darkMode)} title={darkMode ? '라이트 모드' : '다크 모드'}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>

      {/* 필터 영역 - 시설 유형 드롭다운 + 지역 드롭다운 */}
      <div className="filter-bar">
        {/* 시설 유형 드롭다운 */}
        <div className="filter-dropdown-wrapper">
          <button
            className={`filter-dropdown-btn ${selectedTypes.size < 4 ? 'filtered' : ''}`}
            onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowRegionDropdown(false); }}
          >
            <span className="dropdown-label">
              {selectedTypes.size === 4 ? '전체 유형' :
               selectedTypes.size === 1 ? RELIGION_CONFIG[Array.from(selectedTypes)[0]]?.label :
               `${selectedTypes.size}개 선택`}
            </span>
            <span className="dropdown-arrow">{showTypeDropdown ? '▲' : '▼'}</span>
          </button>
          {showTypeDropdown && (
            <div className="filter-dropdown">
              <label className="dropdown-item" onClick={() => toggleAllTypes()}>
                <input
                  type="checkbox"
                  checked={selectedTypes.size === 4}
                  onChange={() => {}}
                />
                <span className="item-label">전체 선택</span>
              </label>
              <div className="dropdown-divider" />
              {Object.entries(RELIGION_CONFIG).map(([type, config]) => (
                <label
                  key={type}
                  className="dropdown-item"
                  onClick={(e) => { e.preventDefault(); toggleType(type as ReligionType); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(type as ReligionType)}
                    onChange={() => {}}
                  />
                  <span className="item-icon" style={{ color: config.color }}>{config.icon}</span>
                  <span className="item-label">{config.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 지역 드롭다운 */}
        <div className="filter-dropdown-wrapper">
          <button
            className={`filter-dropdown-btn ${selectedRegion !== '전체' ? 'filtered' : ''}`}
            onClick={() => { setShowRegionDropdown(!showRegionDropdown); setShowTypeDropdown(false); }}
          >
            <span className="dropdown-label">{selectedRegion === '전체' ? '전국' : selectedRegion}</span>
            <span className="dropdown-arrow">{showRegionDropdown ? '▲' : '▼'}</span>
          </button>
          {showRegionDropdown && (
            <div className="filter-dropdown region-dropdown">
              {REGIONS.map(region => (
                <div
                  key={region}
                  className={`dropdown-item ${selectedRegion === region ? 'active' : ''}`}
                  onClick={() => selectRegion(region)}
                >
                  <span className="item-label">{region === '전체' ? '전국' : region}</span>
                  {selectedRegion === region && <span className="item-check">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 필터 초기화 */}
        {(selectedTypes.size < 4 || selectedRegion !== '전체') && (
          <button
            className="filter-reset-btn"
            onClick={() => {
              setSelectedTypes(new Set(['church', 'catholic', 'temple', 'cult']))
              setSelectedRegion('전체')
            }}
          >
            초기화
          </button>
        )}
      </div>

      {/* 드롭다운 배경 클릭 시 닫기 */}
      {(showTypeDropdown || showRegionDropdown) && (
        <div
          className="dropdown-overlay"
          onClick={() => { setShowTypeDropdown(false); setShowRegionDropdown(false); }}
        />
      )}

      {/* 사이드 메뉴 (슬라이드) */}
      <div className={`side-menu-overlay ${!sidebarCollapsed ? 'open' : ''}`} onClick={() => setSidebarCollapsed(true)} />
      <aside className={`side-menu ${!sidebarCollapsed ? 'open' : ''}`}>
        <div className="side-menu-header">
          <div className="app-info">
            <span className="app-logo">🙏</span>
            <div className="app-title">
              <h2>종교시설 찾기</h2>
              <span className="app-subtitle">{facilities.length.toLocaleString()}개 시설</span>
            </div>
          </div>
          <button className="side-menu-close" onClick={() => setSidebarCollapsed(true)}>×</button>
        </div>

        <div className="side-menu-content">
          {/* 지역 바로가기 */}
          <div className="menu-section">
            <h3>지역 바로가기</h3>
            <div className="region-grid">
              {REGIONS.map(region => (
                <button
                  key={region}
                  className={`region-btn ${selectedRegion === region ? 'active' : ''}`}
                  onClick={() => selectRegion(region)}
                >
                  {region === '전체' ? '전국' : region}
                </button>
              ))}
            </div>
          </div>

          {/* 즐겨찾기 */}
          {favoriteFacilities.length > 0 && (
            <div className="menu-section">
              <h3>즐겨찾기 ({favoriteFacilities.length})</h3>
              <div className="menu-list">
                {favoriteFacilities.slice(0, 5).map(facility => (
                  <div key={facility.id} className="menu-item" onClick={() => { handleSearchResultClick(facility); setSidebarCollapsed(true); }}>
                    <span className="item-dot" style={{ background: RELIGION_CONFIG[facility.type]?.color }} />
                    <div className="item-info">
                      <span className="item-name">{facility.name}</span>
                      <span className="item-sub">{RELIGION_CONFIG[facility.type]?.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 최근 본 시설 */}
          {recentFacilities.length > 0 && (
            <div className="menu-section">
              <h3>최근 본 시설</h3>
              <div className="menu-list">
                {recentFacilities.slice(0, 5).map(facility => (
                  <div key={facility.id} className="menu-item" onClick={() => { handleSearchResultClick(facility); setSidebarCollapsed(true); }}>
                    <span className="item-dot" style={{ background: RELIGION_CONFIG[facility.type]?.color }} />
                    <div className="item-info">
                      <span className="item-name">{facility.name}</span>
                      <span className="item-sub">{RELIGION_CONFIG[facility.type]?.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="menu-footer">
            <p>데이터: 카카오맵 · 업데이트: {DATA_UPDATE_DATE}</p>
          </div>
        </div>
      </aside>

      {/* 지도 영역 */}
      <main className="map-area">
        <div className="map-container">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onLoad={handleMapLoad}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapStyle}
            interactiveLayerIds={['facility-markers', 'sido-fill']}
            onClick={handleMapClick}
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

            {/* 시도별 배경색 + 시군구 경계선 */}
            <Source id="sigungu" type="geojson" data={choroplethData}>
              <Layer key={`sido-fill-${selectedSido || 'none'}`} {...sidoFillLayer} />
              <Layer {...sigunguLineLayer} />
            </Source>

            {/* 시도 라벨 - 줌 8 이하 */}
            <Source id="sido-labels" type="geojson" data={sidoLabelData}>
              <Layer {...sidoLabelLayer} />
            </Source>

            {/* 시군구 라벨 - 줌 8~13 */}
            <Source id="sigungu-labels" type="geojson" data={sigunguLabelData}>
              <Layer {...sigunguLabelLayer} />
            </Source>

            {/* 개별 시설 이모지 마커 + 라벨 */}
            <Source
              id="facilities"
              type="geojson"
              data={geojsonData}
            >
              <Layer {...facilityMarkerLayer} />
              <Layer {...facilityLabelLayer} />
            </Source>

            {/* 검색된 지역 경계선 표시 */}
            {regionBoundary && (
              <Source id="region-boundary" type="geojson" data={regionBoundary}>
                <Layer
                  id="region-boundary-fill"
                  type="fill"
                  paint={{
                    'fill-color': '#3B82F6',
                    'fill-opacity': 0.15
                  }}
                />
                <Layer
                  id="region-boundary-line"
                  type="line"
                  paint={{
                    'line-color': '#3B82F6',
                    'line-width': 3,
                    'line-opacity': 0.8
                  }}
                />
              </Source>
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
                    <button
                      className="popup-btn nav roadview"
                      onClick={() => openStreetView(popupFacility.lat, popupFacility.lng, popupFacility.name)}
                      title="스트리트뷰 보기"
                    >
                      👁️ 스트리트뷰
                    </button>
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
        </div>
      </main>

      {/* 로드뷰 바텀시트 */}
      {streetViewModal && (
        <div className={`streetview-sheet ${streetViewModal.expanded ? 'expanded' : 'half'}`}>
          <div className="streetview-header">
            <div className="streetview-handle" onClick={() => setStreetViewModal(prev => prev ? { ...prev, expanded: !prev.expanded } : null)}>
              <div className="handle-bar" />
            </div>
            <div className="streetview-title-row">
              <h3>{streetViewModal.name}</h3>
              <div className="streetview-actions">
                <button
                  className="streetview-expand-btn"
                  onClick={() => setStreetViewModal(prev => prev ? { ...prev, expanded: !prev.expanded } : null)}
                  title={streetViewModal.expanded ? '축소' : '전체화면'}
                >
                  {streetViewModal.expanded ? '⬇️' : '⬆️'}
                </button>
                <button className="streetview-close" onClick={() => setStreetViewModal(null)}>×</button>
              </div>
            </div>
          </div>
          <div className="streetview-content">
            <div className="streetview-buttons">
              <a
                href={`https://map.kakao.com/?q=${encodeURIComponent(streetViewModal.name)}&map_type=TYPE_MAP&target=bike&rt=,,,${streetViewModal.lat},${streetViewModal.lng}&rv=on`}
                target="_blank"
                rel="noopener noreferrer"
                className="streetview-main-btn kakao"
              >
                <span className="btn-icon">🗺️</span>
                <span className="btn-text">카카오 로드뷰</span>
                <span className="btn-desc">가장 정확한 한국 거리뷰</span>
              </a>
              <a
                href={`https://map.naver.com/p/search/${encodeURIComponent(streetViewModal.name)}?c=${streetViewModal.lng},${streetViewModal.lat},18,0,0,0,dh`}
                target="_blank"
                rel="noopener noreferrer"
                className="streetview-main-btn naver"
              >
                <span className="btn-icon">🟢</span>
                <span className="btn-text">네이버 거리뷰</span>
                <span className="btn-desc">상세 정보와 함께 보기</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 바텀시트 - 검색 결과 */}
      <div className={`bottom-sheet ${bottomSheetState}`}>
        <div className="bottom-sheet-handle" onClick={() => setBottomSheetState(bottomSheetState === 'expanded' ? 'peek' : 'expanded')}>
          <div className="handle-bar" />
        </div>
        <div className="bottom-sheet-header">
          <span className="result-count">
            {searchQuery ? `"${searchQuery}" 검색 결과 ` : ''}
            {filteredFacilities.length.toLocaleString()}개
          </span>
          {bottomSheetState !== 'collapsed' && (
            <button className="close-sheet" onClick={() => setBottomSheetState('collapsed')}>×</button>
          )}
        </div>
        <div className="bottom-sheet-content">
          {paginatedSearchResults.map(facility => (
            <div
              key={facility.id}
              className="result-item"
              onClick={() => { handleSearchResultClick(facility); setBottomSheetState('peek'); }}
            >
              <span className="result-dot" style={{ background: RELIGION_CONFIG[facility.type]?.color }} />
              <div className="result-info">
                <span className="result-name">{highlightText(facility.name, debouncedSearchQuery)}</span>
                <span className="result-address">{facility.roadAddress || facility.address}</span>
                <span className="result-type">{RELIGION_CONFIG[facility.type]?.label}</span>
              </div>
              <button
                className={`result-fav ${favorites.includes(facility.id) ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(facility.id); }}
              >
                {favorites.includes(facility.id) ? '★' : '☆'}
              </button>
            </div>
          ))}
          {totalSearchPages > 1 && (
            <div className="sheet-pagination">
              <button onClick={() => setSearchResultsPage(p => Math.max(1, p - 1))} disabled={searchResultsPage === 1}>이전</button>
              <span>{searchResultsPage} / {totalSearchPages}</span>
              <button onClick={() => setSearchResultsPage(p => Math.min(totalSearchPages, p + 1))} disabled={searchResultsPage === totalSearchPages}>다음</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
