import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alphaspace.app',
  appName: 'AlphaSpace',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Jonli sayt URL-manzili. Men bu yerda o'zgartirsam, ilovada ham o'zgaradi!
    url: 'https://ais-dev-qzzs55jvbqhtejm2as6mav-294424582679.asia-east1.run.app',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      androidScaleType: "CENTER_CROP"
    },
    StatusBar: {
      style: 'LIGHT'
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK'
    }
  }
};

export default config;
