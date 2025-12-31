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
      style: 'LIGHT',
      backgroundColor: '#4F46E500' // 투명
    }
  }
};

export default config;
