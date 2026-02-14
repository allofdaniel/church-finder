import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.allofdaniel.koreareligionmap',
  appName: 'Korea Religion Map',
  webDir: 'dist',
  android: {
    backgroundColor: '#4F46E5'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000'
    }
  }
};

export default config;
