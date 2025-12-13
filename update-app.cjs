const fs = require('fs');
const path = require('path');

const appContent = `import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

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
  church: {
    icon: '⛪',
    label: '교회',
    color: '#4F46E5',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    bgLight: '#EEF2FF'
  },
  catholic: {
    icon: '✝️',
    label: '성당',
    color: '#DB2777',
    gradient: 'linear-gradient(135deg, #DB2777 0%, #E11D48 100%)',
    bgLight: '#FDF2F8'
  },
  temple: {
    icon: '🛕',
    label: '사찰',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
    bgLight: '#ECFDF5'
  }
}

const REGIONS = ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

const facilities: ReligiousFacility[] = allReligiousData

const createMarkerIcon = (type: 'church' | 'catholic' | 'temple') => {
  const config = RELIGION_CONFIG[type]
  return L.divIcon({
    className: 'custom-marker',
    html: \`<div class="marker-icon" style="background:\${config.gradient}">\${config.icon}</div>\`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  })
}

const createClusterIcon = (count: number, types: Record<string, number>) => {
  const dominant = Object.entries(types).sort((a, b) => b[1] - a[1])[0]
  const config = RELIGION_CONFIG[dominant[0] as keyof typeof RELIGION_CONFIG]

  return L.divIcon({
    className: 'cluster-marker',
    html: \`<div class="cluster-icon" style="background:\${config.gradient}"><span>\${count}</span></div>\`,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  })
}

const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: '<div class="user-marker"><div class="user-marker-pulse"></div><div class="user-marker-dot"></div></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

function MapController({ center, zoom }: { center: [number, number] | null, zoom: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  return null
}

function VisibleMarkersHandler({
  facilities,
  onVisibleChange
}: {
  facilities: ReligiousFacility[],
  onVisibleChange: (visible: ReligiousFacility[], clusters: Array<{lat: number, lng: number, count: number, types: Record<string, number>, facilities: ReligiousFacility[]}>) => void
}) {
  const map = useMapEvents({
    moveend: () => updateVisible(),
    zoomend: () => updateVisible()
  })

  const updateVisible = useCallback(() => {
    const bounds = map.getBounds()
    const zoom = map.getZoom()
    const visible = facilities.filter(f =>
      f.lat >= bounds.getSouth() &&
      f.lat <= bounds.getNorth() &&
      f.lng >= bounds.getWest() &&
      f.lng <= bounds.getEast()
    )

    if (visible.length > 500 && zoom < 14) {
      const gridSize = zoom < 10 ? 1 : zoom < 12 ? 0.5 : 0.2
      const grid: Record<string, ReligiousFacility[]> = {}

      visible.forEach(f => {
        const key = \`\${Math.floor(f.lat / gridSize)}_\${Math.floor(f.lng / gridSize)}\`
        if (!grid[key]) grid[key] = []
        grid[key].push(f)
      })

      const clusters = Object.values(grid).map(group => {
        const types: Record<string, number> = {}
        group.forEach(f => {
          types[f.type] = (types[f.type] || 0) + 1
        })
        return {
          lat: group.reduce((sum, f) => sum + f.lat, 0) / group.length,
          lng: group.reduce((sum, f) => sum + f.lng, 0) / group.length,
          count: group.length,
          types,
          facilities: group
        }
      })
      onVisibleChange([], clusters)
    } else {
      onVisibleChange(visible.slice(0, 200), [])
    }
  }, [map, facilities, onVisibleChange])

  return null
}

function App() {
  const [selectedType, setSelectedType] = useState<ReligionType>('all')
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [selectedFacility, setSelectedFacility] = useState<ReligiousFacility | null>(null)
  const [visibleMarkers, setVisibleMarkers] = useState<ReligiousFacility[]>([])
  const [clusters, setClusters] = useState<Array<{lat: number, lng: number, count: number, types: Record<string, number>, facilities: ReligiousFacility[]}>>([])
  const [listPage, setListPage] = useState(1)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  const [mapZoom, setMapZoom] = useState<number | null>(null)
  const ITEMS_PER_PAGE = 20

  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      if (selectedType !== 'all' && f.type !== selectedType) return false
      if (selectedRegion !== '전체' && !f.region.includes(selectedRegion)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return f.name.toLowerCase().includes(q) ||
               f.address.toLowerCase().includes(q) ||
               (f.denomination && f.denomination.toLowerCase().includes(q))
      }
      return true
    })
  }, [selectedType, selectedRegion, searchQuery])

  const handleVisibleChange = useCallback((visible: ReligiousFacility[], newClusters: typeof clusters) => {
    setVisibleMarkers(visible)
    setClusters(newClusters)
  }, [])

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation([latitude, longitude])
        setMapCenter([latitude, longitude])
        setMapZoom(14)
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('위치 정보 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.')
            break
          case error.POSITION_UNAVAILABLE:
            alert('위치 정보를 사용할 수 없습니다.')
            break
          case error.TIMEOUT:
            alert('위치 정보 요청 시간이 초과되었습니다.')
            break
          default:
            alert('위치를 가져오는 중 오류가 발생했습니다.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const paginatedList = useMemo(() => {
    const start = (listPage - 1) * ITEMS_PER_PAGE
    return filteredFacilities.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredFacilities, listPage])

  const totalPages = Math.ceil(filteredFacilities.length / ITEMS_PER_PAGE)

  const stats = useMemo(() => {
    const counts = { church: 0, catholic: 0, temple: 0 }
    filteredFacilities.forEach(f => counts[f.type]++)
    return counts
  }, [filteredFacilities])

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const nearbyFacilities = useMemo(() => {
    if (!userLocation) return []
    return filteredFacilities
      .map(f => ({
        ...f,
        distance: getDistance(userLocation[0], userLocation[1], f.lat, f.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10)
  }, [userLocation, filteredFacilities])

  return (
    <div className="app">
      <header>
        <h1>
          <span className="header-icon">⛪</span>
          종교시설 찾기
        </h1>
        <p className="subtitle">전국 71,656개 종교시설 정보</p>
      </header>

      <div className="stats-bar">
        {Object.entries(RELIGION_CONFIG).map(([type, config]) => (
          <div
            key={type}
            className={\`stat-item\${selectedType === type ? ' active' : ''}\`}
            onClick={() => setSelectedType(selectedType === type ? 'all' : type as ReligionType)}
            style={{ '--accent-color': config.color } as React.CSSProperties}
          >
            <span className="stat-icon">{config.icon}</span>
            <span className="stat-label">{config.label}</span>
            <span className="stat-count">{stats[type as keyof typeof stats].toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="이름, 주소, 교단으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
        )}
      </div>

      <div className="filter-row">
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="region-select"
        >
          {REGIONS.map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
        <button
          className={\`location-btn\${isLocating ? ' loading' : ''}\`}
          onClick={handleGetLocation}
          disabled={isLocating}
        >
          {isLocating ? '📍 찾는 중...' : '📍 내 위치'}
        </button>
      </div>

      <div className="view-toggle">
        <button
          className={viewMode === 'map' ? 'active' : ''}
          onClick={() => setViewMode('map')}
        >
          🗺️ 지도
        </button>
        <button
          className={viewMode === 'list' ? 'active' : ''}
          onClick={() => setViewMode('list')}
        >
          📋 목록
        </button>
      </div>

      <div className="results-info">
        검색 결과: <strong>{filteredFacilities.length.toLocaleString()}</strong>개
        {userLocation && nearbyFacilities.length > 0 && (
          <span className="nearby-info"> · 가장 가까운 시설: {nearbyFacilities[0].name} ({nearbyFacilities[0].distance.toFixed(1)}km)</span>
        )}
      </div>

      {viewMode === 'map' ? (
        <div className="map-wrapper">
          <MapContainer
            center={[36.5, 127.5]}
            zoom={7}
            className="map-container"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />
            <VisibleMarkersHandler
              facilities={filteredFacilities}
              onVisibleChange={handleVisibleChange}
            />
            {userLocation && (
              <>
                <Marker position={userLocation} icon={createUserLocationIcon()}>
                  <Popup>
                    <div className="user-popup">
                      <strong>📍 현재 위치</strong>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={userLocation}
                  radius={1000}
                  pathOptions={{ color: '#4F46E5', fillColor: '#4F46E5', fillOpacity: 0.1 }}
                />
              </>
            )}
            {clusters.map((cluster, i) => (
              <Marker
                key={\`cluster-\${i}\`}
                position={[cluster.lat, cluster.lng]}
                icon={createClusterIcon(cluster.count, cluster.types)}
              >
                <Popup>
                  <div className="cluster-popup">
                    <strong>{cluster.count}개 시설</strong>
                    <div className="cluster-breakdown">
                      {Object.entries(cluster.types).map(([type, count]) => (
                        <span key={type}>
                          {RELIGION_CONFIG[type as keyof typeof RELIGION_CONFIG].icon} {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            {visibleMarkers.map(facility => (
              <Marker
                key={facility.id}
                position={[facility.lat, facility.lng]}
                icon={createMarkerIcon(facility.type)}
                eventHandlers={{
                  click: () => setSelectedFacility(facility)
                }}
              >
                <Popup>
                  <div className="marker-popup">
                    <strong>{facility.name}</strong>
                    <p>{facility.address}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <div className="list-container">
          {userLocation && nearbyFacilities.length > 0 && (
            <div className="nearby-section">
              <h3>📍 내 주변 시설</h3>
              <div className="nearby-list">
                {nearbyFacilities.slice(0, 5).map(facility => (
                  <div
                    key={\`nearby-\${facility.id}\`}
                    className="nearby-card"
                    onClick={() => setSelectedFacility(facility)}
                  >
                    <span className="nearby-icon" style={{ background: RELIGION_CONFIG[facility.type].gradient }}>
                      {RELIGION_CONFIG[facility.type].icon}
                    </span>
                    <div className="nearby-info-text">
                      <span className="nearby-name">{facility.name}</span>
                      <span className="nearby-distance">{facility.distance.toFixed(1)}km</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="facility-list">
            {paginatedList.map(facility => (
              <div
                key={facility.id}
                className="facility-card"
                onClick={() => setSelectedFacility(facility)}
              >
                <div className="facility-header">
                  <span
                    className="facility-type-icon"
                    style={{ background: RELIGION_CONFIG[facility.type].gradient }}
                  >
                    {RELIGION_CONFIG[facility.type].icon}
                  </span>
                  <div className="facility-info">
                    <h3>{facility.name}</h3>
                    <span className="facility-type-label">
                      {RELIGION_CONFIG[facility.type].label}
                      {facility.denomination && \` · \${facility.denomination}\`}
                    </span>
                  </div>
                  <span className="source-badge">카카오</span>
                </div>
                <p className="facility-address">{facility.roadAddress || facility.address}</p>
                <div className="facility-meta">
                  {facility.phone && <span className="facility-phone">📞 {facility.phone}</span>}
                  {facility.website && <span className="facility-website">🌐 웹사이트</span>}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setListPage(p => Math.max(1, p - 1))}
                disabled={listPage === 1}
              >
                이전
              </button>
              <span>{listPage} / {totalPages}</span>
              <button
                onClick={() => setListPage(p => Math.min(totalPages, p + 1))}
                disabled={listPage === totalPages}
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {selectedFacility && (
        <div className="modal-overlay" onClick={() => setSelectedFacility(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedFacility(null)}>×</button>

            <div className="modal-header">
              <span
                className="modal-type-icon"
                style={{ background: RELIGION_CONFIG[selectedFacility.type].gradient }}
              >
                {RELIGION_CONFIG[selectedFacility.type].icon}
              </span>
              <div>
                <h2>{selectedFacility.name}</h2>
                <p className="modal-type">
                  {RELIGION_CONFIG[selectedFacility.type].label}
                  {selectedFacility.denomination && \` · \${selectedFacility.denomination}\`}
                </p>
              </div>
            </div>

            <div className="data-source">
              <span className="source-icon">📍</span>
              <span>데이터 출처: <strong>카카오맵</strong></span>
            </div>

            {selectedFacility.isCult && (
              <div className="cult-warning">
                ⚠️ 주의: 이단/사이비 의심 시설입니다
                {selectedFacility.cultType && <span> ({selectedFacility.cultType})</span>}
              </div>
            )}

            <div className="modal-section">
              <h4>📍 주소</h4>
              <p>{selectedFacility.roadAddress || selectedFacility.address}</p>
              {userLocation && (
                <p className="distance-info">
                  현재 위치에서 {getDistance(userLocation[0], userLocation[1], selectedFacility.lat, selectedFacility.lng).toFixed(1)}km
                </p>
              )}
            </div>

            {selectedFacility.phone && (
              <div className="modal-section">
                <h4>📞 연락처</h4>
                <p>{selectedFacility.phone}</p>
              </div>
            )}

            {selectedFacility.serviceTime && (
              <div className="modal-section">
                <h4>🕐 예배/법회 시간</h4>
                <p>{selectedFacility.serviceTime}</p>
              </div>
            )}

            {selectedFacility.pastor && (
              <div className="modal-section">
                <h4>👤 담임</h4>
                <p>{selectedFacility.pastor}</p>
              </div>
            )}

            {selectedFacility.category && (
              <div className="modal-section">
                <h4>📂 분류</h4>
                <p>{selectedFacility.category}</p>
              </div>
            )}

            <div className="modal-actions">
              {selectedFacility.kakaoUrl && (
                <a
                  href={selectedFacility.kakaoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn kakao"
                >
                  🗺️ 카카오맵
                </a>
              )}
              {selectedFacility.website && (
                <a
                  href={selectedFacility.website.startsWith('http') ? selectedFacility.website : \`https://\${selectedFacility.website}\`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn website"
                >
                  🌐 웹사이트
                </a>
              )}
              {selectedFacility.phone && (
                <a
                  href={\`tel:\${selectedFacility.phone}\`}
                  className="action-btn call"
                >
                  📞 전화
                </a>
              )}
              <a
                href={\`https://map.naver.com/v5/search/\${encodeURIComponent(selectedFacility.name + ' ' + selectedFacility.address)}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn naver"
              >
                🗺️ 네이버맵
              </a>
            </div>

            <div className="modal-footer">
              <p className="data-note">
                ℹ️ 이 정보는 카카오맵에서 수집되었습니다. 최신 정보와 다를 수 있으니 방문 전 확인해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>
          데이터 출처:
          <a href="https://map.kakao.com" target="_blank" rel="noopener noreferrer"> 카카오맵</a>
          {' '}| 총 {facilities.length.toLocaleString()}개 시설
        </p>
      </footer>
    </div>
  )
}

export default App
`;

const targetPath = path.join(__dirname, 'src', 'App.tsx');
fs.writeFileSync(targetPath, appContent, 'utf8');
console.log('App.tsx updated successfully!');
