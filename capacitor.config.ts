import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alphaspace.app',
  appName: 'AlphaSpace',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '692431917555-2ut6tiqfbuplb78shl5r6tnr9sv31bph.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
