import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Base relativa: o build precisa ser aberto via file:// no app desktop (Electron).
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    cssTarget: 'chrome100',
    assetsInlineLimit: 2048,
  },
  server: {
    host: '127.0.0.1',
    port: 4321,
  },
});
