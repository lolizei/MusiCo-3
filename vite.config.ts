import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { strudelWorkletAssets } from './build/strudelWorklets';

export default defineConfig({
  plugins: [react(), strudelWorkletAssets()],
  // Production worklets are emitted as local assets for the desktop CSP.
  server: { port: 5173 },
});
