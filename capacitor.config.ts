import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dollarwise.app',
  appName: 'DollarWise',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email", "https://www.googleapis.com/auth/drive.appdata"],
      serverClientId: "1030290473472-ft8s3csn3vt7s1va7c569pcogavvb21b.apps.googleusercontent.com",
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
