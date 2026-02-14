import { memo, useRef, useEffect, useCallback } from 'react'
import { useFilterStore, useUIStore } from '../../store'
import { RELIGION_CONFIG, REGIONS, SIDO_COLORS } from '../../constants/config'
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

  // Refs for click outside detection
  const typeDropdownRef = useRef<HTMLDivElement>(null)
  const regionDropdownRef = useRef<HTMLDivElement>(null)
  const focusedIndexRef = useRef<number>(-1)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(target)) {
        setShowTypeDropdown(false)
      }
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(target)) {
        setShowRegionDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [setShowTypeDropdown, setShowRegionDropdown])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowTypeDropdown(false)
        setShowRegionDropdown(false)
        focusedIndexRef.current = -1
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [setShowTypeDropdown, setShowRegionDropdown])

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region)
    setShowRegionDropdown(false)
    setSidebarCollapsed(true)
  }

  // Keyboard navigation for type dropdown
  const typeOptions = ['all', ...Object.keys(RELIGION_CONFIG)]
  const handleTypeKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!showTypeDropdown) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        setShowTypeDropdown(true)
        focusedIndexRef.current = 0
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusedIndexRef.current = Math.min(focusedIndexRef.current + 1, typeOptions.length - 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusedIndexRef.current = Math.max(focusedIndexRef.current - 1, 0)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (focusedIndexRef.current === 0) {
          toggleAllTypes()
        } else {
          const type = typeOptions[focusedIndexRef.current] as ReligionType
          toggleType(type)
        }
        break
      case 'Escape':
        setShowTypeDropdown(false)
        focusedIndexRef.current = -1
        break
    }
  }, [showTypeDropdown, setShowTypeDropdown, toggleAllTypes, toggleType, typeOptions])

  // Keyboard navigation for region dropdown
  const regionOptions = REGIONS
  const handleRegionKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!showRegionDropdown) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        setShowRegionDropdown(true)
        focusedIndexRef.current = 0
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusedIndexRef.current = Math.min(focusedIndexRef.current + 1, regionOptions.length - 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusedIndexRef.current = Math.max(focusedIndexRef.current - 1, 0)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        handleRegionSelect(regionOptions[focusedIndexRef.current])
        focusedIndexRef.current = -1
        break
      case 'Escape':
        setShowRegionDropdown(false)
        focusedIndexRef.current = -1
        break
    }
  }, [showRegionDropdown, setShowRegionDropdown, regionOptions, handleRegionSelect])

  return (
    <div className="filter-bar" role="toolbar" aria-label={t.filterBar || 'Filter controls'}>
      {/* Facility Type Dropdown */}
      <div className="filter-dropdown-wrapper" ref={typeDropdownRef}>
        <button
          className={`filter-dropdown-btn ${selectedTypes.size < 4 ? 'filtered' : ''}`}
          onClick={() => {
            setShowTypeDropdown(!showTypeDropdown)
            setShowRegionDropdown(false)
            setShowLangDropdown(false)
            focusedIndexRef.current = 0
          }}
          onKeyDown={handleTypeKeyDown}
          aria-expanded={showTypeDropdown}
          aria-haspopup="listbox"
          aria-label={t.selectType || 'Select religion type'}
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
          <div
            className="filter-dropdown type-chips-dropdown"
            role="listbox"
            aria-label={t.religionTypes || 'Religion types'}
            tabIndex={-1}
          >
            <div
              className={`type-chip type-chip-all ${selectedTypes.size === 4 ? 'active' : ''} ${focusedIndexRef.current === 0 ? 'focused' : ''}`}
              onClick={() => toggleAllTypes()}
              role="option"
              aria-selected={selectedTypes.size === 4}
              tabIndex={0}
            >
              <span className="type-chip-label">{t.selectAll}</span>
            </div>
            <div className="type-chips-grid">
              {Object.entries(RELIGION_CONFIG).map(([type, config], index) => {
                const isSelected = selectedTypes.has(type as ReligionType)
                const isFocused = focusedIndexRef.current === index + 1
                return (
                  <div
                    key={type}
                    className={`type-chip ${isSelected ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                    style={isSelected ? { background: config.color, borderColor: config.color } : {}}
                    onClick={() => toggleType(type as ReligionType)}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                  >
                    <img src={config.iconPath} alt="" className="type-chip-icon" aria-hidden="true" />
                    <span className="type-chip-label">{t[type as keyof typeof t]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Region Dropdown */}
      <div className="filter-dropdown-wrapper" ref={regionDropdownRef}>
        <button
          className={`filter-dropdown-btn ${selectedRegion !== '전체' ? 'filtered' : ''}`}
          onClick={() => {
            setShowRegionDropdown(!showRegionDropdown)
            setShowTypeDropdown(false)
            setShowLangDropdown(false)
            focusedIndexRef.current = 0
          }}
          onKeyDown={handleRegionKeyDown}
          aria-expanded={showRegionDropdown}
          aria-haspopup="listbox"
          aria-label={t.selectRegion || 'Select region'}
        >
          <span className="dropdown-label">{translateRegion(selectedRegion)}</span>
          <span className="dropdown-arrow" aria-hidden="true">{showRegionDropdown ? '\u25b2' : '\u25bc'}</span>
        </button>

        {showRegionDropdown && (
          <div
            className="filter-dropdown region-chips-dropdown"
            role="listbox"
            aria-label={t.regions || 'Regions'}
            tabIndex={-1}
          >
            <div
              className={`region-chip region-chip-all ${selectedRegion === '전체' ? 'active' : ''} ${focusedIndexRef.current === 0 ? 'focused' : ''}`}
              onClick={() => handleRegionSelect('전체')}
              role="option"
              aria-selected={selectedRegion === '전체'}
              tabIndex={0}
            >
              {translateRegion('전체')}
            </div>
            <div className="region-chips-grid">
              {REGIONS.filter(r => r !== '전체').map((region, index) => {
                const isSelected = selectedRegion === region
                const isFocused = focusedIndexRef.current === index + 1
                const color = SIDO_COLORS[region] || '#6366F1'
                return (
                  <div
                    key={region}
                    className={`region-chip ${isSelected ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                    style={isSelected ? { background: color, borderColor: color, color: '#fff' } : {}}
                    onClick={() => handleRegionSelect(region)}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                  >
                    {translateRegion(region)}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reset Filters Button */}
      {(selectedTypes.size < 4 || selectedRegion !== '\uc804\uccb4') && (
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
