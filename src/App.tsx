import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

interface ServiceTime {
  day: string
  time: string
  name: string
}

interface Church {
  id: number
  name: string
  address: string
  phone: string
  website: string
  lat: number
  lng: number
  denomination: string
  services: ServiceTime[]
  features: string[]
  youtubeChannel?: string
}

const sampleChurches: Church[] = [
  {
    id: 1,
    name: '여의도순복음교회',
    address: '서울 영등포구 여의대로 74',
    phone: '02-783-4000',
    website: 'https://www.fgtv.com',
    lat: 37.5219,
    lng: 126.9245,
    denomination: '순복음',
    services: [
      { day: '주일', time: '07:00', name: '1부 예배' },
      { day: '주일', time: '09:00', name: '2부 예배' },
      { day: '주일', time: '11:00', name: '3부 예배' },
      { day: '주일', time: '14:00', name: '4부 예배' },
      { day: '수요일', time: '19:00', name: '수요예배' },
    ],
    features: ['주차가능', '청년부', '영어예배', '수화통역'],
    youtubeChannel: 'https://youtube.com/@fgtv'
  },
  {
    id: 2,
    name: '사랑의교회',
    address: '서울 서초구 반포대로 121',
    phone: '02-3495-1151',
    website: 'https://www.sarang.org',
    lat: 37.4919,
    lng: 127.0058,
    denomination: '대한예수교장로회(합동)',
    services: [
      { day: '주일', time: '06:30', name: '새벽예배' },
      { day: '주일', time: '09:00', name: '1부 예배' },
      { day: '주일', time: '11:00', name: '2부 예배' },
      { day: '주일', time: '14:00', name: '3부 예배' },
      { day: '금요일', time: '20:00', name: '금요기도회' },
    ],
    features: ['주차가능', '청년부', '어린이예배'],
    youtubeChannel: 'https://youtube.com/@sarangchurch'
  },
  {
    id: 3,
    name: '온누리교회',
    address: '서울 서초구 반포대로 277',
    phone: '02-3472-2311',
    website: 'https://www.onnuri.org',
    lat: 37.5037,
    lng: 126.9960,
    denomination: '대한예수교장로회(통합)',
    services: [
      { day: '주일', time: '08:00', name: '1부 예배' },
      { day: '주일', time: '10:00', name: '2부 예배' },
      { day: '주일', time: '12:00', name: '3부 예배' },
      { day: '주일', time: '15:00', name: '영어예배' },
      { day: '수요일', time: '19:30', name: '수요예배' },
    ],
    features: ['주차가능', '청년부', '영어예배', '선교회'],
    youtubeChannel: 'https://youtube.com/@onnurichurch'
  },
  {
    id: 4,
    name: '명성교회',
    address: '서울 강동구 명성로 8',
    phone: '02-2205-1004',
    website: 'https://www.mschurch.org',
    lat: 37.5358,
    lng: 127.1320,
    denomination: '대한예수교장로회(통합)',
    services: [
      { day: '주일', time: '06:00', name: '새벽예배' },
      { day: '주일', time: '09:00', name: '1부 예배' },
      { day: '주일', time: '11:00', name: '2부 예배' },
      { day: '주일', time: '14:00', name: '3부 예배' },
    ],
    features: ['주차가능', '장애인편의시설'],
  },
  {
    id: 5,
    name: '충현교회',
    address: '서울 마포구 마포대로 136',
    phone: '02-393-3597',
    website: 'https://www.chunghyun.org',
    lat: 37.5495,
    lng: 126.9486,
    denomination: '대한예수교장로회(통합)',
    services: [
      { day: '주일', time: '07:00', name: '1부 예배' },
      { day: '주일', time: '09:30', name: '2부 예배' },
      { day: '주일', time: '11:30', name: '3부 예배' },
      { day: '수요일', time: '19:30', name: '수요예배' },
    ],
    features: ['주차가능', '청년부'],
  },
  {
    id: 6,
    name: '광림교회',
    address: '서울 강남구 삼성로 508',
    phone: '02-555-3501',
    website: 'https://www.kwanglim.org',
    lat: 37.5121,
    lng: 127.0541,
    denomination: '기독교대한감리회',
    services: [
      { day: '주일', time: '06:30', name: '새벽예배' },
      { day: '주일', time: '09:00', name: '1부 예배' },
      { day: '주일', time: '11:00', name: '2부 예배' },
      { day: '수요일', time: '19:00', name: '수요예배' },
    ],
    features: ['주차가능', '청년부', '음악예배'],
  },
]

function App() {
  const [churches] = useState<Church[]>(sampleChurches)
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list')
  const [filterDay, setFilterDay] = useState<string>('주일')
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  const filteredChurches = churches.filter(church =>
    church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    church.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    church.denomination.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (viewMode === 'map' && mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([37.5665, 126.9780], 11)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current)

      const churchIcon = L.divIcon({
        className: 'church-marker',
        html: '<div class="marker-icon">⛪</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      })

      filteredChurches.forEach(church => {
        const marker = L.marker([church.lat, church.lng], { icon: churchIcon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(`<b>${church.name}</b><br>${church.address}`)

        marker.on('click', () => setSelectedChurch(church))
      })
    }

    return () => {
      if (mapInstanceRef.current && viewMode !== 'map') {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [viewMode, filteredChurches])

  const getNextService = (services: ServiceTime[]) => {
    const now = new Date()
    const dayNames = ['주일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    const today = dayNames[now.getDay()]
    const currentTime = now.getHours() * 100 + now.getMinutes()

    const todayServices = services.filter(s => s.day === today)
    for (const service of todayServices) {
      const [hours, mins] = service.time.split(':').map(Number)
      const serviceTime = hours * 100 + mins
      if (serviceTime > currentTime) {
        return { ...service, isToday: true }
      }
    }
    return null
  }

  const getDayServices = (services: ServiceTime[], day: string) => {
    return services.filter(s => s.day === day)
  }

  return (
    <div className="app">
      <header>
        <h1>⛪ 교회 찾기</h1>
        <p className="subtitle">주변 교회와 예배 시간을 찾아보세요</p>
      </header>

      <div className="search-container">
        <input
          type="text"
          placeholder="교회명, 주소, 교단으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="view-toggle">
        <button
          className={viewMode === 'list' ? 'active' : ''}
          onClick={() => setViewMode('list')}
        >
          목록
        </button>
        <button
          className={viewMode === 'map' ? 'active' : ''}
          onClick={() => setViewMode('map')}
        >
          지도
        </button>
      </div>

      <div className="day-filter">
        {['주일', '수요일', '금요일'].map(day => (
          <button
            key={day}
            className={filterDay === day ? 'active' : ''}
            onClick={() => setFilterDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      {viewMode === 'map' ? (
        <div ref={mapRef} className="map-container"></div>
      ) : (
        <div className="church-list">
          {filteredChurches.map(church => {
            const nextService = getNextService(church.services)
            const dayServices = getDayServices(church.services, filterDay)

            return (
              <div
                key={church.id}
                className="church-card"
                onClick={() => setSelectedChurch(church)}
              >
                <div className="church-header">
                  <h3>{church.name}</h3>
                  <span className="denomination">{church.denomination}</span>
                </div>
                <p className="address">{church.address}</p>

                {nextService && (
                  <div className="next-service">
                    <span className="badge live">다음 예배</span>
                    <span>{nextService.time} - {nextService.name}</span>
                  </div>
                )}

                <div className="services-preview">
                  <span className="service-day">{filterDay} 예배:</span>
                  {dayServices.length > 0 ? (
                    dayServices.map((s, i) => (
                      <span key={i} className="service-time">{s.time}</span>
                    ))
                  ) : (
                    <span className="no-service">예배 없음</span>
                  )}
                </div>

                <div className="features">
                  {church.features.slice(0, 3).map((f, i) => (
                    <span key={i} className="feature-tag">{f}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedChurch && (
        <div className="modal-overlay" onClick={() => setSelectedChurch(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedChurch(null)}>×</button>

            <h2>{selectedChurch.name}</h2>
            <p className="modal-denomination">{selectedChurch.denomination}</p>

            <div className="modal-section">
              <h4>📍 주소</h4>
              <p>{selectedChurch.address}</p>
            </div>

            <div className="modal-section">
              <h4>📞 연락처</h4>
              <p>{selectedChurch.phone}</p>
            </div>

            <div className="modal-section">
              <h4>🕐 예배 시간</h4>
              <div className="service-list">
                {selectedChurch.services.map((service, i) => (
                  <div key={i} className="service-item">
                    <span className="service-day-badge">{service.day}</span>
                    <span className="service-time-text">{service.time}</span>
                    <span className="service-name">{service.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <h4>✨ 특징</h4>
              <div className="features-list">
                {selectedChurch.features.map((f, i) => (
                  <span key={i} className="feature-tag">{f}</span>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              {selectedChurch.website && (
                <a href={selectedChurch.website} target="_blank" rel="noopener noreferrer" className="action-btn website">
                  🌐 웹사이트
                </a>
              )}
              {selectedChurch.youtubeChannel && (
                <a href={selectedChurch.youtubeChannel} target="_blank" rel="noopener noreferrer" className="action-btn youtube">
                  ▶️ 온라인 예배
                </a>
              )}
              <a href={`tel:${selectedChurch.phone}`} className="action-btn call">
                📞 전화하기
              </a>
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>데이터 제보: 예배 시간이 변경되었나요? 알려주세요!</p>
      </footer>
    </div>
  )
}

export default App
