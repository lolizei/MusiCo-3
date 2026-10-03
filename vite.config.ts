import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Strudel ships audio worklets; keep it out of dep pre-bundling quirks
  // only if problems show up. Default config is tried first (see README).
  server: { port: 5173 },
});
