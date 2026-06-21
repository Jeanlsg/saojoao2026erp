import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercadinho.app',
  appName: 'Favorito Supermercado Coxim',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    backgroundColor: '#FAFAF5',
  },
};

export default config;
