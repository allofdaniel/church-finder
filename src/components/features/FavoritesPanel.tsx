import { memo } from 'react'
import type { ReligiousFacility } from '../../types/facility'
import { RELIGION_CONFIG } from '../../constants/config'
import type { TranslationStrings } from '../../constants/translations'

interface FavoritesPanelProps {
  t: TranslationStrings
  isOpen: boolean
  onClose: () => void
  facilities: ReligiousFacility[]
  onFacilityClick: (facility: ReligiousFacility) => void
  onRemoveFavorite: (id: string) => void
  translateName: (name: string) => string
  translateAddress: (address: string) => string
}

export const FavoritesPanel = memo(function FavoritesPanel({
  t,
  isOpen,
  onClose,
  facilities,
  onFacilityClick,
  onRemoveFavorite,
  translateName,
  translateAddress
}: FavoritesPanelProps) {
  if (!isOpen) return null

  const handleFacilityClick = (facility: ReligiousFacility) => {
    onFacilityClick(facility)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="favorites-panel-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="favorites-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t.favorites}
      >
        {/* Header */}
        <div className="favorites-panel-header">
          <h3>{t.favorites} ({facilities.length})</h3>
          <button
            className="favorites-panel-close"
            onClick={onClose}
            aria-label="닫기"
          >
            \u00d7
          </button>
        </div>

        {/* Content */}
        <div className="favorites-panel-content">
          {facilities.length === 0 ? (
            <div className="favorites-empty">
              <span className="empty-icon" aria-hidden="true">\u2606</span>
              <p>{t.noFavorites}</p>
              <p className="empty-hint">{t.noFavoritesHint}</p>
            </div>
          ) : (
            facilities.map(facility => (
              <div
                key={facility.id}
                className="favorites-item"
                onClick={() => handleFacilityClick(facility)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleFacilityClick(facility)}
              >
                <span
                  className="favorites-dot"
                  style={{ background: RELIGION_CONFIG[facility.type]?.color }}
                  aria-hidden="true"
                />
                <div className="favorites-info">
                  <span className="favorites-name">{translateName(facility.name)}</span>
                  <span className="favorites-address">
                    {translateAddress(facility.roadAddress || facility.address)}
                  </span>
                </div>
                <button
                  className="favorites-remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveFavorite(facility.id)
                  }}
                  aria-label={`${facility.name} 즐겨찾기 제거`}
                >
                  \u00d7
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
})

export default FavoritesPanel
