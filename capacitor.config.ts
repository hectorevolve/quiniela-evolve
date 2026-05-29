import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mx.evolve.torneo',
  appName: 'Evolve Torneo 2026',
  webDir: 'out',
  server: {
    // Load directly from Vercel — updates to the web app
    // are instant without needing a new app store submission
    url: 'https://quiniela-evolve.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
