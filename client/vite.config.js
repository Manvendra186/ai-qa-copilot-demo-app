import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev server on 5174 (5173 is the AI QA Copilot web shell's port).
// /api + /health proxy to the demo server (default :4000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
});
