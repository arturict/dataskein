import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  appType: 'spa',
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 5000,
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },
});
