import { memo } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import type { ReligiousFacility } from '../../types/facility'
import { RELIGION_CONFIG } from '../../constants/config'
import type { TranslationStrings } from '../../constants/translations'

interface CultInfo {
  name: string
  source?: string
}

interface FacilityPopupProps {
  facility: ReligiousFacility
  t: TranslationStrings
  favorites: string[]
  youtubeChannels: Record<string, string>
  cultInfo: Record<string, CultInfo>
  onClose: () => void
  onToggleFavorite: (id: string) => void
  onShare: (facility: ReligiousFacility) => void
  translateName: (name: string) => string
  translateAddress: (address: string) => string
  isValidWebsite: (url: string | null) => boolean
}

export const FacilityPopup = memo(function FacilityPopup({
  facility,
  t,
  favorites,
  youtubeChannels,
  cultInfo,
  onClose,
  onToggleFavorite,
  onShare,
  translateName,
  translateAddress,
  isValidWebsite
}: FacilityPopupProps) {
  const isFavorite = favorites.includes(facility.id)
  const config = RELIGION_CONFIG[facility.type]

  return (
    <Popup
      longitude={facility.lng}
      latitude={facility.lat}
      anchor="bottom"
      onClose={onClose}
      closeButton
      closeOnClick={false}
      maxWidth="280px"
      className="full-popup"
    >
      <div className="popup-full">
        {/* Title Row */}
        <div className="popup-title-row">
          <span
            className="popup-type-label"
            style={{ color: config?.color || '#888' }}
          >
            {t[facility.type as keyof TranslationStrings]}
          </span>
          <h3 className="popup-name">{translateName(facility.name)}</h3>
        </div>

        {/* Cult Warning */}
        {facility.isCult && facility.cultType && (
          <span
            className="popup-cult-badge"
            title={cultInfo[facility.cultType]?.source || '이단대책협의회'}
          >
            \u26a0\ufe0f {cultInfo[facility.cultType]?.name || facility.cultType}
          </span>
        )}

        {/* Denomination */}
        {facility.denomination && (
          <p className="popup-denomination">{facility.denomination}</p>
        )}

        {/* Info */}
        <div className="popup-info">
          <div className="popup-info-row">
            <span>{translateAddress(facility.roadAddress || facility.address)}</span>
          </div>
          {facility.phone && (
            <div className="popup-info-row">
              <a href={`tel:${facility.phone}`} className="popup-phone-link">
                {facility.phone}
              </a>
            </div>
          )}
        </div>

        {/* Top Actions */}
        <div className="popup-actions-top">
          <button
            className={`popup-btn favorite ${isFavorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite(facility.id)}
            title={t.favorite}
            aria-pressed={isFavorite}
          >
            {isFavorite ? '\u2605' : '\u2606'} {t.favorite}
          </button>
          <button
            className="popup-btn share"
            onClick={() => onShare(facility)}
            title={t.share}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
              <polyline points="16,6 12,2 8,6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg> {t.share}
          </button>
        </div>

        {/* Navigation Buttons */}
        <div className="popup-nav-buttons">
          <a
            href={facility.kakaoUrl || `https://place.map.kakao.com/${facility.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="popup-btn nav kakao"
            title={t.kakao}
          >
            <img
              src="https://www.kakaocorp.com/page/favicon.ico"
              alt=""
              width="14"
              height="14"
              style={{ marginRight: '3px', verticalAlign: 'middle' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            {t.kakao}
          </a>
          <a
            href={`https://map.naver.com/p/search/${encodeURIComponent(facility.name + ' ' + (facility.roadAddress || facility.address))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="popup-btn nav naver"
            title={t.naver}
          >
            <img
              src="https://www.naver.com/favicon.ico"
              alt=""
              width="14"
              height="14"
              style={{ marginRight: '3px', verticalAlign: 'middle' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            {t.naver}
          </a>
          {youtubeChannels[facility.id] && (
            <a
              href={youtubeChannels[facility.id]}
              target="_blank"
              rel="noopener noreferrer"
              className="popup-btn nav youtube"
              title="YouTube 채널"
            >
              YouTube
            </a>
          )}
          {isValidWebsite(facility.website) && facility.website && (
            <a
              href={facility.website.startsWith('http') ? facility.website : `https://${facility.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="popup-btn nav website"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '2px', verticalAlign: 'middle' }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              {t.website}
            </a>
          )}
        </div>

        {/* Bottom Actions - Streetview */}
        <div className="popup-actions-bottom">
          <button
            onClick={() => {
              window.location.href = `kakaomap://roadview?p=${facility.lat},${facility.lng}`
            }}
            className="popup-btn roadview"
            title={t.roadview}
          >
            <img
              src="https://www.kakaocorp.com/page/favicon.ico"
              alt=""
              width="12"
              height="12"
              style={{ marginRight: '2px', verticalAlign: 'middle' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            {t.roadview}
          </button>
          <button
            onClick={() => {
              window.location.href = `nmap://panorama?lat=${facility.lat}&lng=${facility.lng}&appname=com.allofdaniel.koreareligionmap`
            }}
            className="popup-btn streetview"
            title={t.streetview}
          >
            <img
              src="https://www.naver.com/favicon.ico"
              alt=""
              width="12"
              height="12"
              style={{ marginRight: '2px', verticalAlign: 'middle' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            {t.streetview}
          </button>
          {facility.phone && (
            <a href={`tel:${facility.phone}`} className="popup-btn call">
              {t.call}
            </a>
          )}
        </div>
      </div>
    </Popup>
  )
})

export default FacilityPopup
