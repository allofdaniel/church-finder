import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Detect platform and add class to body for platform-specific CSS
// Android에서는 styles.xml의 fitsSystemWindows=true가 safe-area를 자동 처리
const platform = Capacitor.getPlatform()
if (platform === 'android') {
  document.body.classList.add('platform-android')
} else if (platform === 'ios') {
  document.body.classList.add('platform-ios')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
