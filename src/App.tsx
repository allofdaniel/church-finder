import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

import allReligiousData from './data/all-religious.json'
import sigunguBoundaries from './data/sigungu-boundaries.json'
import facilitySigunguMap from './data/facility-sigungu-map.json'
import youtubeChannels from './data/youtube-channels.json'

// Base64 인라인 아이콘 (Android WebView 호환)
const ICON_BASE64 = {
  church: 'data:image/png;base64,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',
  catholic: 'data:image/png;base64,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',
  temple: 'data:image/png;base64,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',
  cult: 'data:image/png;base64,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'
}


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

  // 맵 로드 핸들러 - 커스텀 아이콘 로드 (Base64 인라인 이미지 사용 - Android WebView 호환)
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // Base64 인라인 이미지 직접 로드 (Android WebView 호환)
    const icons = [
      { id: 'church-icon', base64: ICON_BASE64.church },
      { id: 'catholic-icon', base64: ICON_BASE64.catholic },
      { id: 'temple-icon', base64: ICON_BASE64.temple },
      { id: 'cult-icon', base64: ICON_BASE64.cult }
    ]

    icons.forEach(({ id, base64 }) => {
      if (!map.hasImage(id)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.loadImage(base64, (error: any, image: any) => {
          if (error) {
            console.error(`Failed to load icon ${id}:`, error)
            return
          }
          if (image && !map.hasImage(id)) {
            map.addImage(id, image, { sdf: false })
          }
        })
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
      'icon-size': ['interpolate', ['linear'], ['zoom'],
        10, 0.4,
        12, 0.5,
        14, 0.7,
        16, 0.9,
        18, 1.1
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
