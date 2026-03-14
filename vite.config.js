import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      // Exclude server-side packages from the frontend bundle
      external: [],
    },
  },
  server: {
    port: 5173,
  },
  // Prevent Vite from trying to resolve server-only imports
  optimizeDeps: {
    exclude: ['@prisma/client', 'prisma'],
  },
});
