const fs = require('fs');
const path = require('path');

const content = `import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

// @ts-expect-error - JSON import
import allReligiousData from './data/all-religious.json'

interface ReligiousFacility {
  id: string
  name: string
  type: 'church' | 'catholic' | 'temple'
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

type ReligionType = 'all' | 'church' | 'catholic' | 'temple'

const RELIGION_CONFIG = {
  church: { icon: '⛪', label: '교회', color: '#4F46E5', gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', bgLight: '#EEF2FF' },
  catholic: { icon: '✝️', label: '성당', color: '#DB2777', gradient: 'linear-gradient(135deg, #DB2777 0%, #E11D48 100%)', bgLight: '#FDF2F8' },
  temple: { icon: '🛕', label: '사찰', color: '#059669', gradient: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)', bgLight: '#ECFDF5' }
}

const REGIONS = ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

const createMarkerIcon = (type: 'church' | 'catholic' | 'temple', isSelected = false) => {
  const config = RELIGION_CONFIG[type]
  const size = isSelected ? 44 : 36
  return L.divIcon({
    className: \`custom-marker \${type} \${isSelected ? 'selected' : ''}\`,
    html: \`<div class="marker-inner" style="background: \${config.gradient}; width: \${size}px; height: \${size}px;"><span>\${config.icon}</span></div>\`,
    iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size]
  })
}

const createClusterIcon = (count: number, types: Record<string, number>) => {
  const size = Math.min(60, 36 + Math.log10(count) * 12)
  const dominant = Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0] || 'church'
  const config = RELIGION_CONFIG[dominant as keyof typeof RELIGION_CONFIG]
  return L.divIcon({
    className: 'cluster-marker',
    html: \`<div class="cluster-inner" style="background: \${config.gradient}; width: \${size}px; height: \${size}px;"><span>\${count >= 1000 ? (count/1000).toFixed(1) + 'k' : count}</span></div>\`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2]
  })
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.setView(center, zoom) }, [map, center, zoom])
  return null
}

function VisibleMarkersHandler({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({ moveend: () => onBoundsChange(map.getBounds()), zoomend: () => onBoundsChange(map.getBounds()) })
  useEffect(() => { onBoundsChange(map.getBounds()) }, [map, onBoundsChange])
  return null
}

function App() {
  const [facilities] = useState<ReligiousFacility[]>(allReligiousData as ReligiousFacility[])
  const [selectedFacility, setSelectedFacility] = useState<ReligiousFacility | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [religionFilter, setReligionFilter] = useState<ReligionType>('all')
  const [regionFilter, setRegionFilter] = useState('전체')
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.5, 127.5])
  const [mapZoom, setMapZoom] = useState(7)
  const [visibleBounds, setVisibleBounds] = useState<L.LatLngBounds | null>(null)
  const [listPage, setListPage] = useState(1)
  const listRef = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 50

  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      if (religionFilter !== 'all' && f.type !== religionFilter) return false
      if (regionFilter !== '전체') {
        const regionMatch = f.region?.includes(regionFilter) || f.address?.includes(regionFilter) || f.roadAddress?.includes(regionFilter)
        if (!regionMatch) return false
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return f.name.toLowerCase().includes(query) || f.address?.toLowerCase().includes(query) || f.roadAddress?.toLowerCase().includes(query)
      }
      return true
    })
  }, [facilities, religionFilter, regionFilter, searchQuery])

  const visibleMarkers = useMemo(() => {
    if (!visibleBounds || viewMode !== 'map') return []
    const inBounds = filteredFacilities.filter(f => visibleBounds.contains([f.lat, f.lng]))
    if (inBounds.length > 500) {
      const gridSize = 0.05
      const clusters: Map<string, ReligiousFacility[]> = new Map()
      inBounds.forEach(f => {
        const key = \`\${Math.floor(f.lng / gridSize)},\${Math.floor(f.lat / gridSize)}\`
        if (!clusters.has(key)) clusters.set(key, [])
        clusters.get(key)!.push(f)
      })
      return Array.from(clusters.values()).map(group => ({
        isCluster: true, count: group.length,
        lat: group.reduce((sum, f) => sum + f.lat, 0) / group.length,
        lng: group.reduce((sum, f) => sum + f.lng, 0) / group.length,
        types: group.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc }, {} as Record<string, number>),
        items: group
      }))
    }
    return inBounds.map(f => ({ isCluster: false, facility: f }))
  }, [filteredFacilities, visibleBounds, viewMode])

  const paginatedList = useMemo(() => filteredFacilities.slice(0, listPage * ITEMS_PER_PAGE), [filteredFacilities, listPage])
  const loadMoreItems = useCallback(() => { if (paginatedList.length < filteredFacilities.length) setListPage(p => p + 1) }, [paginatedList.length, filteredFacilities.length])
  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => setVisibleBounds(bounds), [])
  
  const navigateToFacility = useCallback((facility: ReligiousFacility) => {
    setMapCenter([facility.lat, facility.lng]); setMapZoom(16); setSelectedFacility(facility); setViewMode('map')
  }, [])

  const stats = useMemo(() => ({
    church: facilities.filter(f => f.type === 'church').length,
    catholic: facilities.filter(f => f.type === 'catholic').length,
    temple: facilities.filter(f => f.type === 'temple').length
  }), [facilities])

  const handleRegionChange = (region: string) => {
    setRegionFilter(region); setListPage(1)
    const regionCenters: Record<string, [number, number]> = {
      '전체': [36.5, 127.5], '서울': [37.5665, 126.9780], '부산': [35.1796, 129.0756], '대구': [35.8714, 128.6014],
      '인천': [37.4563, 126.7052], '광주': [35.1595, 126.8526], '대전': [36.3504, 127.3845], '울산': [35.5384, 129.3114],
      '세종': [36.4800, 127.2890], '경기': [37.4138, 127.5183], '강원': [37.8228, 128.1555], '충북': [36.6357, 127.4917],
      '충남': [36.5184, 126.8000], '전북': [35.8203, 127.1088], '전남': [34.8679, 126.9910], '경북': [36.4919, 128.8889],
      '경남': [35.4606, 128.2132], '제주': [33.4996, 126.5312]
    }
    setMapCenter(regionCenters[region] || regionCenters['전체'])
    setMapZoom(region === '전체
