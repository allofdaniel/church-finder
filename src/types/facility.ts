// Religious Facility Types

export interface ReligiousFacility {
  id: string
  name: string
  type: ReligionType
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

export type ReligionType = 'church' | 'catholic' | 'temple' | 'cult'
export type FacilityTypeSet = Set<ReligionType>
export type Language = 'ko' | 'en' | 'zh' | 'ja'
export type BottomSheetState = 'collapsed' | 'peek' | 'expanded'

export interface GeocodingResult {
  name: string
  address: string
  lat: number
  lng: number
  type: 'address' | 'facility'
}

export interface SearchIndex {
  id: string
  name: string
  nameLower: string
  nameChosung: string
  address: string
  addressLower: string
  region: string
  type: ReligionType
}

export interface SigunguInfo {
  code: string
  name: string
  sido: string
  count: number
  lng: number
  lat: number
}

export interface ViewState {
  longitude: number
  latitude: number
  zoom: number
}

export interface ReligionConfig {
  icon: string
  iconPath: string
  label: string
  color: string
}

export interface RegionCoord {
  center: [number, number]
  zoom: number
}

// GeoJSON Types for sigungu boundaries
export interface SigunguProperties {
  code: string
  name: string
  sido: string
  sggnm?: string
  adm_nm?: string
  count?: number
  density?: number
}

export interface SigunguFeature {
  type: 'Feature'
  properties: SigunguProperties
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export interface SigunguBoundaries {
  type: 'FeatureCollection'
  features: SigunguFeature[]
}

// GeoJSON coordinate type (can be nested arrays)
export type GeoJSONCoordinate = number | number[] | number[][] | number[][][] | number[][][][]

// Google Geocoding API response types
export interface GoogleGeocodeResult {
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
}

export interface GoogleGeocodeResponse {
  status: string
  results?: GoogleGeocodeResult[]
}

// MapLibre event types
export interface MapClickEvent {
  lngLat: { lng: number; lat: number }
  features?: MapClickFeature[]
  originalEvent?: MouseEvent
}

export interface MapClickFeature {
  layer: { id: string }
  properties: Record<string, unknown>
  geometry: {
    type: string
    coordinates: number[] | number[][] | number[][][]
  }
}

export interface MapLoadEvent {
  target: {
    loadImage: (url: string, callback: (error: Error | undefined, image: ImageData | undefined) => void) => void
    addImage: (name: string, image: ImageData) => void
    hasImage: (name: string) => boolean
  }
}
