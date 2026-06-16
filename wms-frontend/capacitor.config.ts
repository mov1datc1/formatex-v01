import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.formatex.wms',
  appName: 'Formatex WMS',
  webDir: 'dist',
  server: {
    url: 'https://wms-formatex.vercel.app',
    cleartext: true
  }
};

export default config;
