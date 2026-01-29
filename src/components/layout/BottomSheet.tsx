import { memo, useCallback, type CSSProperties, type ReactElement } from 'react'
import { List } from 'react-window'
import type { ReligiousFacility, BottomSheetState } from '../../types/facility'
import { RELIGION_CONFIG } from '../../constants/config'
import type { TranslationStrings } from '../../constants/translations'
import { highlightKeyword } from '../../utils/translation'

interface BottomSheetProps {
  t: TranslationStrings
  state: BottomSheetState
  onStateChange: (state: BottomSheetState) => void
  searchQuery: string
  facilities: ReligiousFacility[]
  favorites: string[]
  onFacilityClick: (facility: ReligiousFacility) => void
  onToggleFavorite: (id: string) => void
  translateName: (name: string) => string
  translateAddress: (address: string) => string
}

// Props passed to each row via rowProps
interface RowDataProps {
  facilities: ReligiousFacility[]
  favorites: string[]
  searchQuery: string
  t: TranslationStrings
  onFacilityClick: (facility: ReligiousFacility) => void
  onToggleFavorite: (id: string) => void
  onStateChange: (state: BottomSheetState) => void
  translateName: (name: string) => string
  translateAddress: (address: string) => string
}

// Row component for virtualized list
function RowComponent({
  index,
  style,
  facilities,
  favorites,
  searchQuery,
  t,
  onFacilityClick,
  onToggleFavorite,
  onStateChange,
  translateName,
  translateAddress
}: {
  ariaAttributes: {
    "aria-posinset": number
    "aria-setsize": number
    role: "listitem"
  }
  index: number
  style: CSSProperties
} & RowDataProps): ReactElement | null {
  const facility = facilities[index]
  if (!facility) return null

  const isFavorite = favorites.includes(facility.id)

  const handleClick = () => {
    onFacilityClick(facility)
    onStateChange('peek')
  }

  return (
    <div
      style={style}
      className="result-item"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <span
        className="result-dot"
        style={{ background: RELIGION_CONFIG[facility.type]?.color }}
        aria-hidden="true"
      />
      <div className="result-info">
        <span className="result-name">
          {highlightKeyword(translateName(facility.name), searchQuery)}
        </span>
        <span className="result-address">
          {translateAddress(facility.roadAddress || facility.address)}
        </span>
        <span className="result-type">
          {t[facility.type as keyof TranslationStrings]}
        </span>
      </div>
      <button
        className={`result-fav ${isFavorite ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(facility.id)
        }}
        aria-label={isFavorite ? '즐겨찾기 제거' : '즐겨찾기 추가'}
        aria-pressed={isFavorite}
      >
        {isFavorite ? '\u2605' : '\u2606'}
      </button>
    </div>
  )
}

export const BottomSheet = memo(function BottomSheet({
  t,
  state,
  onStateChange,
  searchQuery,
  facilities,
  favorites,
  onFacilityClick,
  onToggleFavorite,
  translateName,
  translateAddress
}: BottomSheetProps) {
  const handleToggleExpand = useCallback(() => {
    onStateChange(state === 'expanded' ? 'peek' : 'expanded')
  }, [state, onStateChange])

  const handleClose = useCallback(() => {
    onStateChange('collapsed')
  }, [onStateChange])

  // Calculate list height based on state
  const getListHeight = () => {
    if (state === 'expanded') return Math.min(facilities.length * 72, window.innerHeight * 0.6)
    if (state === 'peek') return Math.min(facilities.length * 72, 288) // 4 items
    return 0
  }

  // Row props to pass data to each row
  const rowProps: RowDataProps = {
    facilities,
    favorites,
    searchQuery,
    t,
    onFacilityClick,
    onToggleFavorite,
    onStateChange,
    translateName,
    translateAddress
  }

  return (
    <div
      className={`bottom-sheet ${state}`}
      role="region"
      aria-label={t.searchResults}
    >
      {/* Handle */}
      <div
        className="bottom-sheet-handle"
        onClick={handleToggleExpand}
        role="button"
        tabIndex={0}
        aria-label={state === 'expanded' ? '축소' : '확장'}
      >
        <div className="handle-bar" />
      </div>

      {/* Header */}
      <div className="bottom-sheet-header">
        <span className="result-count">
          {searchQuery ? `"${searchQuery}" ${t.searchResults} ` : ''}
          {facilities.length.toLocaleString()}{t.count}
        </span>
        {state !== 'collapsed' && (
          <button
            className="close-sheet"
            onClick={handleClose}
            aria-label="닫기"
          >
            \u00d7
          </button>
        )}
      </div>

      {/* Content with Virtualized List */}
      <div className="bottom-sheet-content">
        {facilities.length > 0 ? (
          <List<RowDataProps>
            rowCount={facilities.length}
            rowHeight={72}
            rowComponent={RowComponent}
            rowProps={rowProps}
            defaultHeight={getListHeight()}
            style={{ width: '100%' }}
          />
        ) : (
          <div className="no-results">
            <p>{t.noResults}</p>
          </div>
        )}
      </div>
    </div>
  )
})

export default BottomSheet
