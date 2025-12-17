import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    // 소스맵 비활성화 (리버스 엔지니어링 방지)
    sourcemap: false,
    // 코드 난독화 및 최적화
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // console.log 제거
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        toplevel: true, // 최상위 변수명 난독화
        properties: {
          regex: /^_/ // _로 시작하는 속성 난독화
        }
      },
      format: {
        comments: false // 주석 제거
      }
    },
    rollupOptions: {
      output: {
        // 청크 파일명 해시 처리
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
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
