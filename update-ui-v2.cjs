const fs = require('fs');
const path = require('path');

// New App.tsx with full tooltip and dark mode
const appContent = `import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
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
    color: '#6366F1',
    markerColor: '#4F46E5',
  },
  catholic: {
    icon: '✝️',
    label: '성당',
    color: '#EC4899',
    markerColor: '#DB2777',
  },
  temple: {
    icon: '🛕',
    label: '사찰',
    color: '#10B981',
    markerColor: '#059669',
  }
}

const REGIONS = ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

const DATA_UPDATE_DATE = '2024.12.14'

const isValidWebsite = (url: string | null): boolean => {
  if (!url) return false
  const invalidPatterns = ['policy.daum.net', 'policy.kakao.com', 'cs.kakao.com', 'cs.daum.net']
  return !invalidPatterns.some(pattern => url.includes(pattern))
}

const facilities: ReligiousFacility[] = allReligiousData

function App() {
  const [selectedType, setSelectedType] = useState<ReligionType>('all')
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [popupFacility, setPopupFacility] = useState<ReligiousFacility | null>(null)
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
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const mapRef = useRef<any>(null)
  const ITEMS_PER_PAGE = 20

  // Apply dark mode to body
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

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

  const visibleFacilities = useMemo(() => {
    if (viewState.zoom < 10) {
      const byRegion: Record<string, ReligiousFacility[]> = {}
      filteredFacilities.forEach(f => {
        const region = f.region.split(' ')[0]
        if (!byRegion[region]) byRegion[region] = []
        if (byRegion[region].length < 50) byRegion[region].push(f)
      })
      return Object.values(byRegion).flat()
    }
    return filteredFacilities.slice(0, viewState.zoom >= 14 ? 2000 : viewState.zoom >= 12 ? 1000 : 500)
  }, [filteredFacilities, viewState.zoom])

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

  const handleGeolocate = useCallback((e: any) => {
    setUserLocation({ lat: e.coords.latitude, lng: e.coords.longitude })
  }, [])

  const handleMarkerClick = useCallback((facility: ReligiousFacility) => {
    setPopupFacility(facility)
  }, [])

  useEffect(() => {
    setListPage(1)
  }, [selectedType, selectedRegion, searchQuery])

  const mapStyle = darkMode
    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

  return (
    <div className={\`app \${darkMode ? 'dark' : ''}\`}>
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
            <button
              className="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? '라이트 모드' : '다크 모드'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <span className="total-count">{facilities.length.toLocaleString()}개 시설</span>
          </div>
        </div>
      </header>

      <div className="main-container">
        <aside className="sidebar">
          <div className="filter-section">
            <h3>종교 유형</h3>
            <div className="type-filters">
              {Object.entries(RELIGION_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  className={\`type-btn \${selectedType === type ? 'active' : ''}\`}
                  onClick={() => setSelectedType(selectedType === type ? 'all' : type as ReligionType)}
                  style={{ '--type-color': config.color } as React.CSSProperties}
                >
                  <span className="type-icon">{config.icon}</span>
                  <span className="type-label">{config.label}</span>
                  <span className="type-count">{stats[type as keyof typeof stats].toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>지역</h3>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="region-select"
            >
              {REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <h3>검색</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="이름, 주소, 교단..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>
          </div>

          <div className="filter-section results">
            <div className="results-count">
              검색 결과: <strong>{filteredFacilities.length.toLocaleString()}</strong>개
            </div>
          </div>

          <div className="view-toggle">
            <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>
              🗺️ 지도
            </button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
              📋 목록
            </button>
          </div>
        </aside>

        <main className="content">
          {viewMode === 'map' ? (
            <div className="map-container">
              <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle={mapStyle}
              >
                <NavigationControl position="top-right" />
                <GeolocateControl
                  position="top-right"
                  onGeolocate={handleGeolocate}
                  trackUserLocation
                />

                {visibleFacilities.map(facility => (
                  <Marker
                    key={facility.id}
                    longitude={facility.lng}
                    latitude={facility.lat}
                    anchor="bottom"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation()
                      handleMarkerClick(facility)
                    }}
                  >
                    <div
                      className={\`custom-marker \${facility.type}\`}
                      style={{ '--marker-color': RELIGION_CONFIG[facility.type].markerColor } as React.CSSProperties}
                    >
                      {RELIGION_CONFIG[facility.type].icon}
                    </div>
                  </Marker>
                ))}

                {popupFacility && (
                  <Popup
                    longitude={popupFacility.lng}
                    latitude={popupFacility.lat}
                    anchor="bottom"
                    onClose={() => setPopupFacility(null)}
                    closeButton={true}
                    closeOnClick={false}
                    maxWidth="320px"
                    className="full-popup"
                  >
                    <div className="popup-full">
                      <div className="popup-header">
                        <span className="popup-type-badge" style={{ background: RELIGION_CONFIG[popupFacility.type].color }}>
                          {RELIGION_CONFIG[popupFacility.type].icon} {RELIGION_CONFIG[popupFacility.type].label}
                        </span>
                        {popupFacility.isCult && (
                          <span className="popup-cult-badge">⚠️ 주의</span>
                        )}
                      </div>
                      <h3 className="popup-name">{popupFacility.name}</h3>
                      {popupFacility.denomination && (
                        <p className="popup-denomination">{popupFacility.denomination}</p>
                      )}

                      <div className="popup-info">
                        <div className="popup-info-row">
                          <span className="popup-info-icon">📍</span>
                          <span>{popupFacility.roadAddress || popupFacility.address}</span>
                        </div>
                        {popupFacility.phone && (
                          <div className="popup-info-row">
                            <span className="popup-info-icon">📞</span>
                            <a href={\`tel:\${popupFacility.phone}\`} className="popup-phone-link">{popupFacility.phone}</a>
                          </div>
                        )}
                        {userLocation && (
                          <div className="popup-info-row">
                            <span className="popup-info-icon">🚗</span>
                            <span>{getDistance(userLocation.lat, userLocation.lng, popupFacility.lat, popupFacility.lng).toFixed(1)}km 거리</span>
                          </div>
                        )}
                        {popupFacility.category && (
                          <div className="popup-info-row">
                            <span className="popup-info-icon">📂</span>
                            <span>{popupFacility.category}</span>
                          </div>
                        )}
                      </div>

                      <div className="popup-actions">
                        <a
                          href={popupFacility.kakaoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="popup-btn kakao"
                        >
                          🗺️ 카카오맵
                        </a>
                        <a
                          href={\`https://map.naver.com/v5/search/\${encodeURIComponent(popupFacility.roadAddress || popupFacility.address)}\`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="popup-btn naver"
                        >
                          🗺️ 네이버맵
                        </a>
                        {isValidWebsite(popupFacility.website) && popupFacility.website && (
                          <a
                            href={popupFacility.website.startsWith('http') ? popupFacility.website : \`https://\${popupFacility.website}\`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="popup-btn website"
                          >
                            🌐 웹사이트
                          </a>
                        )}
                        {popupFacility.phone && (
                          <a href={\`tel:\${popupFacility.phone}\`} className="popup-btn call">
                            📞 전화
                          </a>
                        )}
                      </div>
                    </div>
                  </Popup>
                )}
              </Map>

              <div className="map-legend">
                <span className="legend-item church">⛪ 교회</span>
                <span className="legend-item catholic">✝️ 성당</span>
                <span className="legend-item temple">🛕 사찰</span>
              </div>
            </div>
          ) : (
            <div className="list-container">
              <div className="facility-grid">
                {paginatedList.map(facility => (
                  <div
                    key={facility.id}
                    className="facility-card"
                    onClick={() => setPopupFacility(facility)}
                  >
                    <div className="card-header">
                      <span className="card-icon" style={{ background: RELIGION_CONFIG[facility.type].color }}>
                        {RELIGION_CONFIG[facility.type].icon}
                      </span>
                      <div className="card-title">
                        <h4>{facility.name}</h4>
                        <span className="card-type">{RELIGION_CONFIG[facility.type].label}</span>
                      </div>
                      {isValidWebsite(facility.website) && (
                        <span className="has-website">🌐</span>
                      )}
                    </div>
                    <p className="card-address">{facility.roadAddress || facility.address}</p>
                    {facility.phone && <p className="card-phone">📞 {facility.phone}</p>}
                    {userLocation && (
                      <p className="card-distance">
                        📍 {getDistance(userLocation.lat, userLocation.lng, facility.lat, facility.lng).toFixed(1)}km
                      </p>
                    )}
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

      {/* Modal for list view clicks */}
      {viewMode === 'list' && popupFacility && (
        <div className="modal-overlay" onClick={() => setPopupFacility(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPopupFacility(null)}>×</button>

            <div className="modal-header">
              <span className="modal-icon" style={{ background: RELIGION_CONFIG[popupFacility.type].color }}>
                {RELIGION_CONFIG[popupFacility.type].icon}
              </span>
              <div className="modal-title">
                <h2>{popupFacility.name}</h2>
                <span className="modal-type">
                  {RELIGION_CONFIG[popupFacility.type].label}
                  {popupFacility.denomination && \` · \${popupFacility.denomination}\`}
                </span>
              </div>
            </div>

            {popupFacility.isCult && (
              <div className="cult-warning">
                ⚠️ 주의: 이단/사이비 의심 시설
                {popupFacility.cultType && \` (\${popupFacility.cultType})\`}
              </div>
            )}

            <div className="modal-body">
              <div className="info-row">
                <span className="info-icon">📍</span>
                <div className="info-content">
                  <span className="info-label">주소</span>
                  <span className="info-value">{popupFacility.roadAddress || popupFacility.address}</span>
                  {userLocation && (
                    <span className="info-distance">
                      현재 위치에서 {getDistance(userLocation.lat, userLocation.lng, popupFacility.lat, popupFacility.lng).toFixed(1)}km
                    </span>
                  )}
                </div>
              </div>

              {popupFacility.phone && (
                <div className="info-row">
                  <span className="info-icon">📞</span>
                  <div className="info-content">
                    <span className="info-label">연락처</span>
                    <span className="info-value">{popupFacility.phone}</span>
                  </div>
                </div>
              )}

              {popupFacility.category && (
                <div className="info-row">
                  <span className="info-icon">📂</span>
                  <div className="info-content">
                    <span className="info-label">분류</span>
                    <span className="info-value">{popupFacility.category}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <a
                href={popupFacility.kakaoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn kakao"
              >
                🗺️ 카카오맵
              </a>
              {isValidWebsite(popupFacility.website) && popupFacility.website && (
                <a
                  href={popupFacility.website.startsWith('http') ? popupFacility.website : \`https://\${popupFacility.website}\`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn website"
                >
                  🌐 웹사이트
                </a>
              )}
              {popupFacility.phone && (
                <a href={\`tel:\${popupFacility.phone}\`} className="action-btn call">
                  📞 전화
                </a>
              )}
              <a
                href={\`https://map.naver.com/v5/search/\${encodeURIComponent(popupFacility.roadAddress || popupFacility.address)}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn naver"
              >
                🗺️ 네이버맵
              </a>
            </div>

            <div className="modal-footer">
              <span className="data-source">출처: 카카오맵 · 업데이트: {DATA_UPDATE_DATE}</span>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>
          데이터 출처: <a href="https://map.kakao.com" target="_blank" rel="noopener noreferrer">카카오맵</a>
          {' · '}업데이트: {DATA_UPDATE_DATE}
          {' · '}총 {facilities.length.toLocaleString()}개 시설
        </p>
      </footer>
    </div>
  )
}

export default App
`;

// New CSS with dark mode and improved popup
const cssContent = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --accent-color: #4F46E5;
  --accent-hover: #4338CA;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
}

body.dark {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border-color: #334155;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background 0.3s, color 0.3s;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Header */
.header {
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  color: white;
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-sm);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 2rem;
}

.logo-text h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.update-date {
  font-size: 0.75rem;
  opacity: 0.8;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.theme-toggle:hover {
  background: rgba(255,255,255,0.3);
  transform: scale(1.1);
}

.total-count {
  background: rgba(255,255,255,0.2);
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-weight: 600;
}

/* Main Container */
.main-container {
  display: flex;
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* Sidebar */
.sidebar {
  width: 300px;
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.filter-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.type-filters {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  border-color: var(--type-color);
  background: var(--bg-tertiary);
}

.type-btn.active {
  border-color: var(--type-color);
  background: var(--type-color);
  color: white;
}

.type-icon {
  font-size: 1.25rem;
}

.type-label {
  flex: 1;
  font-weight: 500;
}

.type-count {
  font-size: 0.875rem;
  opacity: 0.7;
}

.region-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  font-size: 1rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  padding-right: 2.5rem;
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  font-size: 1rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-muted);
  cursor: pointer;
}

.results-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.results-count strong {
  color: var(--accent-color);
  font-size: 1.125rem;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

.view-toggle button {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle button.active {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

/* Content */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Map */
.map-container {
  flex: 1;
  position: relative;
  min-height: 500px;
}

.custom-marker {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--marker-color);
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s;
}

.custom-marker:hover {
  transform: scale(1.2);
  z-index: 1000;
}

.map-legend {
  position: absolute;
  bottom: 2rem;
  left: 1rem;
  background: var(--bg-secondary);
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Full Popup Styles */
.full-popup .maplibregl-popup-content {
  padding: 0;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.popup-full {
  padding: 1rem;
  min-width: 280px;
  max-width: 320px;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.popup-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.popup-cult-badge {
  padding: 0.25rem 0.5rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.popup-name {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.popup-denomination {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.popup-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 0.75rem;
}

.popup-info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.popup-info-icon {
  flex-shrink: 0;
}

.popup-phone-link {
  color: var(--accent-color);
  text-decoration: none;
}

.popup-phone-link:hover {
  text-decoration: underline;
}

.popup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.popup-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.625rem 0.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.75rem;
  text-decoration: none;
  transition: all 0.2s;
}

.popup-btn.kakao {
  background: #FEE500;
  color: #3C1E1E;
}

.popup-btn.naver {
  background: #03C75A;
  color: white;
}

.popup-btn.website {
  background: #6366F1;
  color: white;
}

.popup-btn.call {
  background: #10B981;
  color: white;
}

.popup-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

/* List */
.list-container {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
  background: var(--bg-primary);
}

.facility-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.facility-card {
  background: var(--bg-secondary);
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.facility-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent-color);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.card-title {
  flex: 1;
  min-width: 0;
}

.card-title h4 {
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-type {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.has-website {
  font-size: 1rem;
}

.card-address {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.card-phone, .card-distance {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding: 1rem;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  background: var(--accent-color);
  color: white;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: 0 1rem;
  font-weight: 500;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-secondary);
  border-radius: 1.5rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-icon {
  width: 56px;
  height: 56px;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
}

.modal-title h2 {
  font-size: 1.25rem;
  font-weight: 700;
}

.modal-type {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.cult-warning {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.modal-body {
  padding: 1.5rem;
}

.info-row {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--bg-tertiary);
}

.info-row:last-child {
  border-bottom: none;
}

.info-icon {
  font-size: 1.25rem;
  width: 24px;
  text-align: center;
}

.info-content {
  flex: 1;
}

.info-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.info-value {
  font-weight: 500;
}

.info-distance {
  display: block;
  font-size: 0.75rem;
  color: var(--accent-color);
  margin-top: 0.25rem;
}

.modal-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  padding: 0 1.5rem 1.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s;
}

.action-btn.kakao {
  background: #FEE500;
  color: #3C1E1E;
}

.action-btn.website {
  background: #6366F1;
  color: white;
}

.action-btn.call {
  background: #10B981;
  color: white;
}

.action-btn.naver {
  background: #03C75A;
  color: white;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.data-source {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Footer */
.footer {
  background: var(--bg-secondary);
  padding: 1rem;
  text-align: center;
  border-top: 1px solid var(--border-color);
}

.footer p {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.footer a {
  color: var(--accent-color);
  text-decoration: none;
}

/* Maplibre Popup Override */
.maplibregl-popup-content {
  background: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
  border-radius: 1rem !important;
  padding: 0 !important;
  box-shadow: var(--shadow-md) !important;
}

.maplibregl-popup-close-button {
  font-size: 1.5rem;
  padding: 0.5rem;
  color: var(--text-secondary);
}

.maplibregl-popup-close-button:hover {
  background: var(--bg-tertiary);
  border-radius: 50%;
}

/* Responsive */
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    max-height: none;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .type-filters {
    flex-direction: row;
    overflow-x: auto;
  }

  .type-btn {
    flex-shrink: 0;
    padding: 0.5rem 0.75rem;
  }

  .map-container {
    min-height: 400px;
  }

  .facility-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    grid-template-columns: repeat(2, 1fr);
  }

  .popup-actions {
    grid-template-columns: 1fr 1fr;
  }

  .header-right {
    gap: 0.5rem;
  }

  .total-count {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
}
`;

// Write files
fs.writeFileSync(path.join(__dirname, 'src', 'App.tsx'), appContent);
fs.writeFileSync(path.join(__dirname, 'src', 'App.css'), cssContent);

console.log('UI v2 업데이트 완료!');
console.log('- 마커 클릭 시 바로 전체 정보가 툴팁에 표시됨');
console.log('- 다크모드/라이트모드 토글 추가');
console.log('- 시스템 테마 자동 감지');
console.log('- localStorage에 테마 저장');
