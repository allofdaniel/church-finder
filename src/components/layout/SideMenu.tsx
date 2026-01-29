import { memo } from 'react'
import type { ReligiousFacility } from '../../types/facility'
import { RELIGION_CONFIG, REGIONS } from '../../constants/config'
import type { TranslationStrings } from '../../constants/translations'

interface SideMenuProps {
  t: TranslationStrings
  isOpen: boolean
  onClose: () => void
  facilities: ReligiousFacility[]
  favoriteFacilities: ReligiousFacility[]
  recentFacilities: ReligiousFacility[]
  selectedRegion: string
  onRegionSelect: (region: string) => void
  onFacilityClick: (facility: ReligiousFacility) => void
  translateName: (name: string) => string
  translateRegion: (region: string) => string
  dataUpdateDate: string
}

export const SideMenu = memo(function SideMenu({
  t,
  isOpen,
  onClose,
  facilities,
  favoriteFacilities,
  recentFacilities,
  selectedRegion,
  onRegionSelect,
  onFacilityClick,
  translateName,
  translateRegion,
  dataUpdateDate
}: SideMenuProps) {
  const handleRegionClick = (region: string) => {
    onRegionSelect(region)
    onClose()
  }

  const handleFacilityClick = (facility: ReligiousFacility) => {
    onFacilityClick(facility)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`side-menu-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Menu */}
      <aside
        className={`side-menu ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t.menu}
      >
        {/* Header */}
        <div className="side-menu-header">
          <div className="app-info">
            <span className="app-logo" aria-hidden="true">\ud83d\ude4f</span>
            <div className="app-title">
              <h2>{t.appTitle}</h2>
              <span className="app-subtitle">
                {facilities.length.toLocaleString()}{t.appSubtitle}
              </span>
            </div>
          </div>
          <button
            className="side-menu-close"
            onClick={onClose}
            aria-label="메뉴 닫기"
          >
            \u00d7
          </button>
        </div>

        {/* Content */}
        <div className="side-menu-content">
          {/* Region Shortcuts */}
          <div className="menu-section">
            <h3>{t.regionShortcut}</h3>
            <div className="region-grid" role="group" aria-label={t.regionShortcut}>
              {REGIONS.map(region => (
                <button
                  key={region}
                  className={`region-btn ${selectedRegion === region ? 'active' : ''}`}
                  onClick={() => handleRegionClick(region)}
                  aria-pressed={selectedRegion === region}
                >
                  {translateRegion(region)}
                </button>
              ))}
            </div>
          </div>

          {/* Favorites */}
          {favoriteFacilities.length > 0 && (
            <div className="menu-section">
              <h3>{t.favorites} ({favoriteFacilities.length})</h3>
              <div className="menu-list" role="list">
                {favoriteFacilities.slice(0, 5).map(facility => (
                  <div
                    key={facility.id}
                    className="menu-item"
                    onClick={() => handleFacilityClick(facility)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleFacilityClick(facility)}
                  >
                    <span
                      className="item-dot"
                      style={{ background: RELIGION_CONFIG[facility.type]?.color }}
                      aria-hidden="true"
                    />
                    <div className="item-info">
                      <span className="item-name">{translateName(facility.name)}</span>
                      <span className="item-sub">
                        {t[facility.type as keyof TranslationStrings]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recently Viewed */}
          {recentFacilities.length > 0 && (
            <div className="menu-section">
              <h3>{t.recentViewed}</h3>
              <div className="menu-list" role="list">
                {recentFacilities.slice(0, 5).map(facility => (
                  <div
                    key={facility.id}
                    className="menu-item"
                    onClick={() => handleFacilityClick(facility)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleFacilityClick(facility)}
                  >
                    <span
                      className="item-dot"
                      style={{ background: RELIGION_CONFIG[facility.type]?.color }}
                      aria-hidden="true"
                    />
                    <div className="item-info">
                      <span className="item-name">{translateName(facility.name)}</span>
                      <span className="item-sub">
                        {t[facility.type as keyof TranslationStrings]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="menu-footer">
            <p>{t.dataSource} {dataUpdateDate}</p>
          </div>
        </div>
      </aside>
    </>
  )
})

export default SideMenu
