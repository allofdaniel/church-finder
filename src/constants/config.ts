import type { ReligionType, ReligionConfig, RegionCoord, Language } from '../types/facility'

// Google API Key (loaded from environment variable)
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''

// Religion/Facility Type Configuration
export const RELIGION_CONFIG: Record<ReligionType, ReligionConfig> = {
  church: { icon: '\u26ea', label: '교회', color: '#6366F1' },
  catholic: { icon: '\u271d\ufe0f', label: '성당', color: '#EC4899' },
  temple: { icon: '\u2638\ufe0f', label: '사찰', color: '#10B981' },
  cult: { icon: '\u26a0\ufe0f', label: '이단의심', color: '#F59E0B' }
}

// Region Coordinates
export const REGION_COORDS: Record<string, RegionCoord> = {
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

export const REGIONS = Object.keys(REGION_COORDS)

// Languages Configuration
export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'ko', label: '한국어', flag: '\ud83c\uddf0\ud83c\uddf7' },
  { code: 'en', label: 'English', flag: '\ud83c\uddfa\ud83c\uddf8' },
  { code: 'zh', label: '中文', flag: '\ud83c\udde8\ud83c\uddf3' },
  { code: 'ja', label: '日本語', flag: '\ud83c\uddef\ud83c\uddf5' }
]

// Map Styles
export const MAP_STYLES = {
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
    layers: [
      {
        id: 'satellite-layer',
        type: 'raster' as const,
        source: 'satellite',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  }
}

// Pagination
export const ITEMS_PER_PAGE = 20
export const SEARCH_RESULTS_PER_PAGE = 50

// Map Layer Colors
export const SIDO_COLORS: Record<string, string> = {
  '서울': '#FF6B6B',
  '부산': '#4ECDC4',
  '대구': '#45B7D1',
  '인천': '#96CEB4',
  '광주': '#FFEAA7',
  '대전': '#DDA0DD',
  '울산': '#98D8C8',
  '세종': '#F7DC6F',
  '경기': '#BB8FCE',
  '강원': '#85C1E9',
  '충북': '#F8B500',
  '충남': '#00CED1',
  '전북': '#FFB347',
  '전남': '#87CEEB',
  '경북': '#DDA0DD',
  '경남': '#98FB98',
  '제주': '#FF69B4'
}

// Data Update Date
export const DATA_UPDATE_DATE = '2024.12.14'

// Cult Information (Source: 이단대책협의회, 한국기독교이단상담소)
export const CULT_INFO: Record<string, { name: string; source: string }> = {
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

// Region Aliases (for search matching)
export const REGION_ALIASES: Record<string, string[]> = {
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
  '제주': ['제주도', '제주특별자치도', 'jeju']
}

// Region to GeoJSON File Mapping
export const REGION_TO_GEOJSON: Record<string, string> = {
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

// Website validation
export const isValidWebsite = (url: string | null): boolean => {
  if (!url) return false
  const invalidPatterns = ['policy.daum.net', 'policy.kakao.com', 'cs.kakao.com', 'cs.daum.net']
  return !invalidPatterns.some(pattern => url.includes(pattern))
}
