import { create } from 'zustand'
import type { ReligiousFacility, ViewState, SigunguInfo } from '../types/facility'

interface MapState {
  viewState: ViewState
  popupFacility: ReligiousFacility | null
  hoveredSigungu: SigunguInfo | null
  selectedSido: string | null
  regionBoundary: unknown
  regionBoundaryLoading: boolean

  // Actions
  setViewState: (state: ViewState | ((prev: ViewState) => ViewState)) => void
  setPopupFacility: (facility: ReligiousFacility | null) => void
  setHoveredSigungu: (sigungu: SigunguInfo | null | ((prev: SigunguInfo | null) => SigunguInfo | null)) => void
  setSelectedSido: (sido: string | null) => void
  setRegionBoundary: (boundary: unknown) => void
  setRegionBoundaryLoading: (loading: boolean) => void

  flyTo: (lng: number, lat: number, zoom?: number) => void
}

export const useMapStore = create<MapState>((set) => ({
  viewState: {
    longitude: 127.5,
    latitude: 36.5,
    zoom: 7
  },
  popupFacility: null,
  hoveredSigungu: null,
  selectedSido: null,
  regionBoundary: null,
  regionBoundaryLoading: false,

  setViewState: (state) => set((prev) => ({
    viewState: typeof state === 'function' ? state(prev.viewState) : state
  })),

  setPopupFacility: (facility) => set({ popupFacility: facility }),
  setHoveredSigungu: (sigungu) => set((prev) => ({
    hoveredSigungu: typeof sigungu === 'function' ? sigungu(prev.hoveredSigungu) : sigungu
  })),
  setSelectedSido: (sido) => set({ selectedSido: sido }),
  setRegionBoundary: (boundary) => set({ regionBoundary: boundary }),
  setRegionBoundaryLoading: (loading) => set({ regionBoundaryLoading: loading }),

  flyTo: (lng, lat, zoom = 14) => {
    set({
      viewState: {
        longitude: lng,
        latitude: lat,
        zoom
      }
    })
  }
}))
