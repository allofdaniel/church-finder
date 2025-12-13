const fs = require('fs');
const path = require('path');

// New App.tsx with Maplibre
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
  const [selectedFacility, setSelectedFacility] = useState<ReligiousFacility | null>(null)
  const [popupFacility, setPopupFacility] = useState<ReligiousFacility | null>(null)
  const [listPage, setListPage] = useState(1)
  const [viewState, setViewState] = useState({
    longitude: 127.5,
    latitude: 36.5,
    zoom: 7
  })
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const mapRef = useRef<any>(null)
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

  const openModal = useCallback((facility: ReligiousFacility) => {
    setSelectedFacility(facility)
    setPopupFacility(null)
  }, [])

  useEffect(() => {
    setListPage(1)
  }, [selectedType, selectedRegion, searchQuery])

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🙏</span>
            <div className="logo-text">
              <h1>종교시설 찾기</h1>
              <span className="update-date">업데이트: {DATA_UPDATE_DATE}</span>
            </div>
          </div>
          <div className="header-stats">
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
                mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
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
                  >
                    <div className="map-popup">
                      <div className="popup-header">
                        <span className="popup-icon">{RELIGION_CONFIG[popupFacility.type].icon}</span>
                        <strong>{popupFacility.name}</strong>
                      </div>
                      <p className="popup-address">{popupFacility.roadAddress || popupFacility.address}</p>
                      {popupFacility.phone && <p className="popup-phone">📞 {popupFacility.phone}</p>}
                      <button className="popup-detail-btn" onClick={() => openModal(popupFacility)}>
                        상세보기
                      </button>
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
                    onClick={() => setSelectedFacility(facility)}
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

      {selectedFacility && (
        <div className="modal-overlay" onClick={() => setSelectedFacility(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedFacility(null)}>×</button>

            <div className="modal-header">
              <span className="modal-icon" style={{ background: RELIGION_CONFIG[selectedFacility.type].color }}>
                {RELIGION_CONFIG[selectedFacility.type].icon}
              </span>
              <div className="modal-title">
                <h2>{selectedFacility.name}</h2>
                <span className="modal-type">
                  {RELIGION_CONFIG[selectedFacility.type].label}
                  {selectedFacility.denomination && \` · \${selectedFacility.denomination}\`}
                </span>
              </div>
            </div>

            {selectedFacility.isCult && (
              <div className="cult-warning">
                ⚠️ 주의: 이단/사이비 의심 시설
                {selectedFacility.cultType && \` (\${selectedFacility.cultType})\`}
              </div>
            )}

            <div className="modal-body">
              <div className="info-row">
                <span className="info-icon">📍</span>
                <div className="info-content">
                  <span className="info-label">주소</span>
                  <span className="info-value">{selectedFacility.roadAddress || selectedFacility.address}</span>
                  {userLocation && (
                    <span className="info-distance">
                      현재 위치에서 {getDistance(userLocation.lat, userLocation.lng, selectedFacility.lat, selectedFacility.lng).toFixed(1)}km
                    </span>
                  )}
                </div>
              </div>

              {selectedFacility.phone && (
                <div className="info-row">
                  <span className="info-icon">📞</span>
                  <div className="info-content">
                    <span className="info-label">연락처</span>
                    <span className="info-value">{selectedFacility.phone}</span>
                  </div>
                </div>
              )}

              {selectedFacility.category && (
                <div className="info-row">
                  <span className="info-icon">📂</span>
                  <div className="info-content">
                    <span className="info-label">분류</span>
                    <span className="info-value">{selectedFacility.category}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <a
                href={selectedFacility.kakaoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn kakao"
              >
                🗺️ 카카오맵
              </a>
              {isValidWebsite(selectedFacility.website) && selectedFacility.website && (
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
                <a href={\`tel:\${selectedFacility.phone}\`} className="action-btn call">
                  📞 전화
                </a>
              )}
              <a
                href={\`https://map.naver.com/v5/search/\${encodeURIComponent(selectedFacility.roadAddress || selectedFacility.address)}\`}
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

// New App.css with improved UI
const cssContent = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #f8fafc;
  color: #1e293b;
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
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
  background: white;
  padding: 1.5rem;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.filter-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
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
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  border-color: var(--type-color);
  background: #f8fafc;
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
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  font-size: 1rem;
  background: white;
  cursor: pointer;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  padding-right: 2.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  font-size: 1rem;
}

.search-input:focus {
  outline: none;
  border-color: #4F46E5;
}

.clear-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #94a3b8;
  cursor: pointer;
}

.results-count {
  font-size: 0.875rem;
  color: #64748b;
}

.results-count strong {
  color: #4F46E5;
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
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle button.active {
  background: #4F46E5;
  color: white;
  border-color: #4F46E5;
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
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Popup */
.map-popup {
  padding: 0.5rem;
  min-width: 200px;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.popup-icon {
  font-size: 1.25rem;
}

.popup-address {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.popup-phone {
  font-size: 0.875rem;
  color: #64748b;
}

.popup-detail-btn {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: #4F46E5;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.popup-detail-btn:hover {
  background: #4338CA;
}

/* List */
.list-container {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.facility-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.facility-card {
  background: white;
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.facility-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-color: #4F46E5;
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
  color: #64748b;
}

.has-website {
  font-size: 1rem;
}

.card-address {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.card-phone, .card-distance {
  font-size: 0.875rem;
  color: #64748b;
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
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  background: #4F46E5;
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
  background: white;
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
  background: #f1f5f9;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
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
  color: #64748b;
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
  border-bottom: 1px solid #f1f5f9;
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
  color: #64748b;
  margin-bottom: 0.25rem;
}

.info-value {
  font-weight: 500;
}

.info-distance {
  display: block;
  font-size: 0.75rem;
  color: #4F46E5;
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.data-source {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Footer */
.footer {
  background: white;
  padding: 1rem;
  text-align: center;
  border-top: 1px solid #e2e8f0;
}

.footer p {
  font-size: 0.875rem;
  color: #64748b;
}

.footer a {
  color: #4F46E5;
  text-decoration: none;
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
    border-bottom: 1px solid #e2e8f0;
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
}
`;

// Write files
fs.writeFileSync(path.join(__dirname, 'src', 'App.tsx'), appContent);
fs.writeFileSync(path.join(__dirname, 'src', 'App.css'), cssContent);

console.log('App.tsx and App.css updated successfully!');
console.log('- Maplibre GL map');
console.log('- Custom emoji markers for each religion type');
console.log('- Improved sidebar layout');
console.log('- Data update date display');
console.log('- Better card and modal design');
