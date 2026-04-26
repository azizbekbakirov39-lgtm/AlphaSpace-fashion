import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartseller.app',
  appName: 'Smart Seller',
  webDir: 'dist',
  server: {
    url: 'https://ais-pre-36ab24ncun33qp6nccdmm4-294424582679.asia-east1.run.app',
    cleartext: true
  }
};

export default config;
