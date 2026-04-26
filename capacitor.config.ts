import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartseller.app',
  appName: 'Smart Seller',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
