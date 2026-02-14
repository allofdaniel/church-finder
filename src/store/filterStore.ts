import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReligionType, FacilityTypeSet, Language } from '../types/facility'

interface FilterState {
  // Filter state
  selectedTypes: FacilityTypeSet
  selectedRegion: string
  searchQuery: string

  // Actions
  setSelectedTypes: (types: FacilityTypeSet) => void
  toggleType: (type: ReligionType) => void
  toggleAllTypes: () => void
  setSelectedRegion: (region: string) => void
  setSearchQuery: (query: string) => void
  resetFilters: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedTypes: new Set(['church', 'catholic', 'temple', 'cult'] as ReligionType[]),
  selectedRegion: '전체',
  searchQuery: '',

  setSelectedTypes: (types) => set({ selectedTypes: types }),

  toggleType: (type) => set((state) => {
    const newSet = new Set(state.selectedTypes)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    return { selectedTypes: newSet }
  }),

  toggleAllTypes: () => set((state) => {
    if (state.selectedTypes.size === 4) {
      return { selectedTypes: new Set() }
    }
    return { selectedTypes: new Set(['church', 'catholic', 'temple', 'cult'] as ReligionType[]) }
  }),

  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  resetFilters: () => set({
    selectedTypes: new Set(['church', 'catholic', 'temple', 'cult'] as ReligionType[]),
    selectedRegion: '전체',
    searchQuery: ''
  })
}))

// UI State Store
interface UIState {
  sidebarCollapsed: boolean
  legendVisible: boolean
  bottomSheetState: 'collapsed' | 'peek' | 'expanded'
  showSuggestions: boolean
  showTypeDropdown: boolean
  showRegionDropdown: boolean
  showFavoritesPanel: boolean
  showLangDropdown: boolean
  darkMode: boolean
  satelliteMode: boolean

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void
  setLegendVisible: (visible: boolean) => void
  setBottomSheetState: (state: 'collapsed' | 'peek' | 'expanded') => void
  setShowSuggestions: (show: boolean) => void
  setShowTypeDropdown: (show: boolean) => void
  setShowRegionDropdown: (show: boolean) => void
  setShowFavoritesPanel: (show: boolean) => void
  setShowLangDropdown: (show: boolean) => void
  setDarkMode: (dark: boolean) => void
  setSatelliteMode: (satellite: boolean) => void
  closeAllDropdowns: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: true,
      legendVisible: true,
      bottomSheetState: 'collapsed',
      showSuggestions: false,
      showTypeDropdown: false,
      showRegionDropdown: false,
      showFavoritesPanel: false,
      showLangDropdown: false,
      darkMode: typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false,
      satelliteMode: false,

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setLegendVisible: (visible) => set({ legendVisible: visible }),
      setBottomSheetState: (state) => set({ bottomSheetState: state }),
      setShowSuggestions: (show) => set({ showSuggestions: show }),
      setShowTypeDropdown: (show) => set({ showTypeDropdown: show }),
      setShowRegionDropdown: (show) => set({ showRegionDropdown: show }),
      setShowFavoritesPanel: (show) => set({ showFavoritesPanel: show }),
      setShowLangDropdown: (show) => set({ showLangDropdown: show }),
      setDarkMode: (dark) => set({ darkMode: dark }),
      setSatelliteMode: (satellite) => set({ satelliteMode: satellite }),

      closeAllDropdowns: () => set({
        showTypeDropdown: false,
        showRegionDropdown: false,
        showLangDropdown: false
      })
    }),
    {
      name: 'korea-religion-map-ui',
      partialize: (state) => ({ darkMode: state.darkMode })
    }
  )
)

// Favorites Store
interface FavoritesState {
  favorites: string[]
  recentViewed: string[]

  addFavorite: (id: string) => void
  removeFavorite: (id: string) => void
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
  addRecentViewed: (id: string) => void
  clearRecentViewed: () => void
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentViewed: [],

      addFavorite: (id) => set((state) => ({
        favorites: state.favorites.includes(id)
          ? state.favorites
          : [...state.favorites, id]
      })),

      removeFavorite: (id) => set((state) => ({
        favorites: state.favorites.filter(f => f !== id)
      })),

      toggleFavorite: (id) => {
        const { favorites } = get()
        if (favorites.includes(id)) {
          set({ favorites: favorites.filter(f => f !== id) })
        } else {
          set({ favorites: [...favorites, id] })
        }
      },

      isFavorite: (id) => get().favorites.includes(id),

      addRecentViewed: (id) => set((state) => {
        const filtered = state.recentViewed.filter(r => r !== id)
        return { recentViewed: [id, ...filtered].slice(0, 50) }
      }),

      clearRecentViewed: () => set({ recentViewed: [] })
    }),
    {
      name: 'korea-religion-map-favorites'
    }
  )
)

// Language Store
interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'ko',
      setLanguage: (lang) => set({ language: lang })
    }),
    {
      name: 'korea-religion-map-language'
    }
  )
)
