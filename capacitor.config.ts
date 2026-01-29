import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.allofdaniel.churchfinder',
  appName: 'ChurchFinder',
  webDir: 'dist',
  android: {
    // WebView가 상태바/네비게이션바 뒤로 확장되도록 설정
    backgroundColor: '#4F46E5'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00FFFFFF'
    }
  }
};

export default config;
