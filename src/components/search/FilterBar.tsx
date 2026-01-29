import { memo } from 'react'
import { useFilterStore, useUIStore } from '../../store'
import { RELIGION_CONFIG, REGIONS } from '../../constants/config'
import type { ReligionType } from '../../types/facility'

interface FilterBarProps {
  t: Record<string, string>
  translateRegion: (region: string) => string
}

export const FilterBar = memo(function FilterBar({ t, translateRegion }: FilterBarProps) {
  const {
    selectedTypes,
    selectedRegion,
    toggleType,
    toggleAllTypes,
    setSelectedRegion,
    resetFilters
  } = useFilterStore()

  const {
    showTypeDropdown,
    showRegionDropdown,
    setShowTypeDropdown,
    setShowRegionDropdown,
    setShowLangDropdown,
    setSidebarCollapsed
  } = useUIStore()

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region)
    setShowRegionDropdown(false)
    setSidebarCollapsed(true)
  }

  return (
    <div className="filter-bar">
      {/* Facility Type Dropdown */}
      <div className="filter-dropdown-wrapper">
        <button
          className={`filter-dropdown-btn ${selectedTypes.size < 4 ? 'filtered' : ''}`}
          onClick={() => {
            setShowTypeDropdown(!showTypeDropdown)
            setShowRegionDropdown(false)
            setShowLangDropdown(false)
          }}
          aria-expanded={showTypeDropdown}
          aria-haspopup="listbox"
        >
          <span className="dropdown-label">
            {selectedTypes.size === 0 ? t.noneSelected :
             selectedTypes.size === 4 ? t.allTypes :
             selectedTypes.size === 1 ? t[Array.from(selectedTypes)[0] as keyof typeof t] :
             `${selectedTypes.size}${t.selected}`}
          </span>
          <span className="dropdown-arrow" aria-hidden="true">{showTypeDropdown ? '\u25b2' : '\u25bc'}</span>
        </button>

        {showTypeDropdown && (
          <div className="filter-dropdown" role="listbox">
            <label
              className="dropdown-item"
              onClick={(e) => { e.preventDefault(); toggleAllTypes() }}
            >
              <input
                type="checkbox"
                checked={selectedTypes.size === 4}
                onChange={() => {}}
                aria-label={t.selectAll}
              />
              <span className="item-label">{t.selectAll}</span>
            </label>
            <div className="dropdown-divider" />
            {Object.entries(RELIGION_CONFIG).map(([type, config]) => (
              <label
                key={type}
                className="dropdown-item"
                onClick={(e) => { e.preventDefault(); toggleType(type as ReligionType) }}
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.has(type as ReligionType)}
                  onChange={() => {}}
                  aria-label={t[type as keyof typeof t]}
                />
                <span className="item-icon" style={{ color: config.color }} aria-hidden="true">
                  {config.icon}
                </span>
                <span className="item-label">{t[type as keyof typeof t]}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Region Dropdown */}
      <div className="filter-dropdown-wrapper">
        <button
          className={`filter-dropdown-btn ${selectedRegion !== '전체' ? 'filtered' : ''}`}
          onClick={() => {
            setShowRegionDropdown(!showRegionDropdown)
            setShowTypeDropdown(false)
            setShowLangDropdown(false)
          }}
          aria-expanded={showRegionDropdown}
          aria-haspopup="listbox"
        >
          <span className="dropdown-label">{translateRegion(selectedRegion)}</span>
          <span className="dropdown-arrow" aria-hidden="true">{showRegionDropdown ? '\u25b2' : '\u25bc'}</span>
        </button>

        {showRegionDropdown && (
          <div className="filter-dropdown region-dropdown" role="listbox">
            {REGIONS.map(region => (
              <div
                key={region}
                className={`dropdown-item ${selectedRegion === region ? 'active' : ''}`}
                onClick={() => handleRegionSelect(region)}
                role="option"
                aria-selected={selectedRegion === region}
                tabIndex={0}
              >
                <span className="item-label">{translateRegion(region)}</span>
                {selectedRegion === region && <span className="item-check" aria-hidden="true">\u2713</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset Filters Button */}
      {(selectedTypes.size < 4 || selectedRegion !== '전체') && (
        <button
          className="filter-reset-btn"
          onClick={resetFilters}
          aria-label={t.reset}
        >
          {t.reset}
        </button>
      )}
    </div>
  )
})

export default FilterBar
