import { useRef, memo } from 'react'
import { useFilterStore, useUIStore } from '../../store'
import type { ReligiousFacility, GeocodingResult } from '../../types/facility'
import { RELIGION_CONFIG } from '../../constants/config'
import { highlightKeyword } from '../../utils/translation'

interface HeaderProps {
  t: Record<string, string>
  filteredFacilities: ReligiousFacility[]
  addressResults: GeocodingResult[]
  isSearchingAddress: boolean
  translateName: (name: string) => string
  translateAddress: (address: string) => string
  onSearchResultClick: (facility: ReligiousFacility) => void
  onAddressSelect: (result: GeocodingResult) => void
  onSearchKeyDown: (e: React.KeyboardEvent) => void
}

export const Header = memo(function Header({
  t,
  filteredFacilities,
  addressResults,
  isSearchingAddress,
  translateName,
  translateAddress,
  onSearchResultClick,
  onAddressSelect,
  onSearchKeyDown
}: HeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { searchQuery, setSearchQuery } = useFilterStore()
  const {
    showSuggestions,
    setShowSuggestions,
    setSidebarCollapsed,
    setBottomSheetState
  } = useUIStore()

  return (
    <header className="search-header">
      <button
        className="menu-btn"
        onClick={() => setSidebarCollapsed(false)}
        title={t.menu}
        aria-label={t.menu}
      >
        <span className="menu-icon" aria-hidden="true">\u2630</span>
      </button>

      <div className="search-bar-wrapper">
        <div className="search-bar">
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSuggestions(e.target.value.length > 0)
            }}
            onKeyDown={onSearchKeyDown}
            onFocus={() => {
              if (searchQuery) setShowSuggestions(true)
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            aria-label={t.search}
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            role="combobox"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => {
                setSearchQuery('')
                setShowSuggestions(false)
                setBottomSheetState('collapsed')
              }}
              aria-label="검색어 지우기"
            >
              \u00d7
            </button>
          )}
        </div>

        {/* Search autocomplete dropdown */}
        {showSuggestions && searchQuery && (filteredFacilities.length > 0 || addressResults.length > 0) && (
          <div className="search-suggestions" role="listbox">
            {/* Address search results */}
            {addressResults.length > 0 && (
              <>
                <div className="suggestion-section-header">
                  <span className="section-icon" aria-hidden="true">\ud83d\udccd</span> {t.addressResults || '주소 검색 결과'}
                  {isSearchingAddress && <span className="loading-spinner" aria-label="로딩 중" />}
                </div>
                {addressResults.map((result, idx) => (
                  <div
                    key={`addr-${idx}`}
                    className="suggestion-item address-item"
                    onClick={() => onAddressSelect(result)}
                    role="option"
                    tabIndex={0}
                  >
                    <span className="suggestion-icon address-icon" aria-hidden="true">\ud83d\udccd</span>
                    <div className="suggestion-info">
                      <span className="suggestion-name">{highlightKeyword(result.name, searchQuery)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Facility search results */}
            {filteredFacilities.length > 0 && (
              <>
                {addressResults.length > 0 && (
                  <div className="suggestion-section-header">
                    <span className="section-icon" aria-hidden="true">\ud83c\udfdb\ufe0f</span> {t.facilityResults || '시설 검색 결과'}
                  </div>
                )}
                {filteredFacilities.slice(0, 8).map(facility => (
                  <div
                    key={facility.id}
                    className="suggestion-item"
                    onClick={() => {
                      onSearchResultClick(facility)
                      setShowSuggestions(false)
                      setSearchQuery(facility.name)
                    }}
                    role="option"
                    tabIndex={0}
                  >
                    <span
                      className="suggestion-icon"
                      style={{ color: RELIGION_CONFIG[facility.type]?.color }}
                      aria-hidden="true"
                    >
                      {RELIGION_CONFIG[facility.type]?.icon}
                    </span>
                    <div className="suggestion-info">
                      <span className="suggestion-name">
                        {highlightKeyword(translateName(facility.name), searchQuery)}
                      </span>
                      <span className="suggestion-address">
                        {highlightKeyword(translateAddress(facility.address), searchQuery)}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
})

export default Header
