import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl')) {
            return 'maplibre'
          }
          if (id.includes('all-religious.json')) {
            return 'religious-data'
          }
          if (id.includes('sigungu-boundaries.json')) {
            return 'sigungu-data'
          }
          if (id.includes('facility-sigungu-map.json')) {
            return 'facility-map'
          }
        }
      }
    }
  }
})
