import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Map, { Source, Layer, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

import allReligiousData from './data/all-religious.json'

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
  temple: { icon: '🛕', label: '사찰', color: '#10B981' },
  cult: { icon: '⚠️', label: '이단/사이비', color: '#EF4444' }
}

const REGIONS = ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

const DATA_UPDATE_DATE = '2024.12.14'

const isValidWebsite = (url: string | null): boolean => {
  if (!url) return false
  const invalidPatterns = ['policy.daum.net', 'policy.kakao.com', 'cs.kakao.com', 'cs.daum.net']
  return !invalidPatterns.some(pattern => url.includes(pattern))
}

const facilities: ReligiousFacility[] = allReligiousData as ReligiousFacility[]

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
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)
  const mapRef = useRef<any>(null)
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      if (selectedType !== 'all' && f.type !== selectedType) return false
      if (selectedRegion !== '전체' && f.region && !f.region.includes(selectedRegion)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return f.name.toLowerCase().includes(q) ||
          f.address.toLowerCase().includes(q) ||
          (f.denomination && f.denomination.toLowerCase().includes(q))
      }
      return true
    })
  }, [selectedType, selectedRegion, searchQuery])

  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredFacilities.map(f => ({
      type: 'Feature' as const,
      properties: { id: f.id, name: f.name, type: f.type, address: f.address, roadAddress: f.roadAddress, phone: f.phone, kakaoUrl: f.kakaoUrl, category: f.category, denomination: f.denomination, isCult: f.isCult, cultType: f.cultType, region: f.region, website: f.website },
      geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] }
    }))
  }), [filteredFacilities])

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

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const handleGeolocate = useCallback((e: any) => setUserLocation({ lat: e.coords.latitude, lng: e.coords.longitude }), [])

  const handleMapClick = useCallback((e: any) => {
    const features = e.features
    if (!features || features.length === 0) return
    const feature = features[0]
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

  useEffect(() => setListPage(1), [selectedType, selectedRegion, searchQuery])

  const mapStyle = darkMode ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

  const clusterLayer: any = { id: 'clusters', type: 'circle', source: 'facilities', filter: ['has', 'point_count'], paint: { 'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 500, '#f28cb1', 1000, '#e74c3c'], 'circle-radius': ['step', ['get', 'point_count'], 20, 100, 25, 500, 30, 1000, 40], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } }
  const clusterCountLayer: any = { id: 'cluster-count', type: 'symbol', source: 'facilities', filter: ['has', 'point_count'], layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-size': 14 }, paint: { 'text-color': '#fff' } }
  const unclusteredPointLayer: any = { id: 'unclustered-point', type: 'circle', source: 'facilities', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['match', ['get', 'type'], 'church', '#6366F1', 'catholic', '#EC4899', 'temple', '#10B981', 'cult', '#EF4444', '#888'], 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } }

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
        <aside className="sidebar">
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
            <h3>지역</h3>
            <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="region-select">
              {REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>
          <div className="filter-section">
            <h3>검색</h3>
            <div className="search-box">
              <input type="text" placeholder="이름, 주소, 교단..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
              {searchQuery && <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>}
            </div>
          </div>
          <div className="filter-section results">
            <div className="results-count">검색 결과: <strong>{filteredFacilities.length.toLocaleString()}</strong>개</div>
          </div>
          <div className="view-toggle">
            <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>🗺️ 지도</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>📋 목록</button>
          </div>
        </aside>

        <main className="content">
          {viewMode === 'map' ? (
            <div className="map-container">
              <Map ref={mapRef} {...viewState} onMove={evt => setViewState(evt.viewState)} style={{ width: '100%', height: '100%' }} mapStyle={mapStyle} interactiveLayerIds={['clusters', 'unclustered-point']} onClick={handleMapClick}>
                <NavigationControl position="top-right" />
                <GeolocateControl position="top-right" onGeolocate={handleGeolocate} trackUserLocation />
                <Source id="facilities" type="geojson" data={geojsonData} cluster={true} clusterMaxZoom={14} clusterRadius={50}>
                  <Layer {...clusterLayer} />
                  <Layer {...clusterCountLayer} />
                  <Layer {...unclusteredPointLayer} />
                </Source>
                {popupFacility && (
                  <Popup longitude={popupFacility.lng} latitude={popupFacility.lat} anchor="bottom" onClose={() => setPopupFacility(null)} closeButton closeOnClick={false} maxWidth="320px" className="full-popup">
                    <div className="popup-full">
                      <div className="popup-header">
                        <span className="popup-type-badge" style={{ background: RELIGION_CONFIG[popupFacility.type]?.color || '#888' }}>{RELIGION_CONFIG[popupFacility.type]?.icon} {RELIGION_CONFIG[popupFacility.type]?.label}</span>
                        {popupFacility.isCult && <span className="popup-cult-badge">⚠️ 주의</span>}
                      </div>
                      <h3 className="popup-name">{popupFacility.name}</h3>
                      {popupFacility.denomination && <p className="popup-denomination">{popupFacility.denomination}</p>}
                      <div className="popup-info">
                        <div className="popup-info-row"><span className="popup-info-icon">📍</span><span>{popupFacility.roadAddress || popupFacility.address}</span></div>
                        {popupFacility.phone && <div className="popup-info-row"><span className="popup-info-icon">📞</span><a href={`tel:${popupFacility.phone}`} className="popup-phone-link">{popupFacility.phone}</a></div>}
                        {userLocation && <div className="popup-info-row"><span className="popup-info-icon">🚗</span><span>{getDistance(userLocation.lat, userLocation.lng, popupFacility.lat, popupFacility.lng).toFixed(1)}km 거리</span></div>}
                      </div>
                      <div className="popup-actions">
                        <a href={popupFacility.kakaoUrl || `https://map.kakao.com/link/search/${encodeURIComponent(popupFacility.name)}`} target="_blank" rel="noopener noreferrer" className="popup-btn kakao">🗺️ 카카오맵</a>
                        <a href={`https://map.naver.com/v5/search/${encodeURIComponent(popupFacility.roadAddress || popupFacility.address)}`} target="_blank" rel="noopener noreferrer" className="popup-btn naver">🗺️ 네이버맵</a>
                        {isValidWebsite(popupFacility.website) && popupFacility.website && <a href={popupFacility.website.startsWith('http') ? popupFacility.website : `https://${popupFacility.website}`} target="_blank" rel="noopener noreferrer" className="popup-btn website">🌐 웹사이트</a>}
                        {popupFacility.phone && <a href={`tel:${popupFacility.phone}`} className="popup-btn call">📞 전화</a>}
                      </div>
                    </div>
                  </Popup>
                )}
              </Map>
              <div className="map-legend">
                <div className="legend-title">클러스터 범례</div>
                <div className="legend-items">
                  <span className="legend-cluster" style={{ background: '#51bbd6' }}>~99</span>
                  <span className="legend-cluster" style={{ background: '#f1f075', color: '#333' }}>100~</span>
                  <span className="legend-cluster" style={{ background: '#f28cb1' }}>500~</span>
                  <span className="legend-cluster" style={{ background: '#e74c3c' }}>1000+</span>
                </div>
                <div className="legend-types">
                  <span className="legend-item church">⛪ 교회</span>
                  <span className="legend-item catholic">✝️ 성당</span>
                  <span className="legend-item temple">🛕 사찰</span>
                  <span className="legend-item cult">⚠️ 이단</span>
                </div>
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
                    {userLocation && <p className="card-distance">📍 {getDistance(userLocation.lat, userLocation.lng, facility.lat, facility.lng).toFixed(1)}km</p>}
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
            {popupFacility.isCult && <div className="cult-warning">⚠️ 주의: 이단/사이비 의심 시설{popupFacility.cultType && ` (${popupFacility.cultType})`}</div>}
            <div className="modal-body">
              <div className="info-row"><span className="info-icon">📍</span><div className="info-content"><span className="info-label">주소</span><span className="info-value">{popupFacility.roadAddress || popupFacility.address}</span>{userLocation && <span className="info-distance">현재 위치에서 {getDistance(userLocation.lat, userLocation.lng, popupFacility.lat, popupFacility.lng).toFixed(1)}km</span>}</div></div>
              {popupFacility.phone && <div className="info-row"><span className="info-icon">📞</span><div className="info-content"><span className="info-label">연락처</span><span className="info-value">{popupFacility.phone}</span></div></div>}
              {popupFacility.category && <div className="info-row"><span className="info-icon">📂</span><div className="info-content"><span className="info-label">분류</span><span className="info-value">{popupFacility.category}</span></div></div>}
            </div>
            <div className="modal-actions">
              <a href={popupFacility.kakaoUrl || `https://map.kakao.com/link/search/${encodeURIComponent(popupFacility.name)}`} target="_blank" rel="noopener noreferrer" className="action-btn kakao">🗺️ 카카오맵</a>
              {isValidWebsite(popupFacility.website) && popupFacility.website && <a href={popupFacility.website.startsWith('http') ? popupFacility.website : `https://${popupFacility.website}`} target="_blank" rel="noopener noreferrer" className="action-btn website">🌐 웹사이트</a>}
              {popupFacility.phone && <a href={`tel:${popupFacility.phone}`} className="action-btn call">📞 전화</a>}
              <a href={`https://map.naver.com/v5/search/${encodeURIComponent(popupFacility.roadAddress || popupFacility.address)}`} target="_blank" rel="noopener noreferrer" className="action-btn naver">🗺️ 네이버맵</a>
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
