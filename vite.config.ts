import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://live.opentracking.co.uk',
        changeOrigin: true,
        rewrite: (path) => {
          try {
            const url = new URL(path, 'http://localhost');
            const event = url.searchParams.get('event');
            const file = url.searchParams.get('file');
            if (event && file) return `/${event}/data/${file}`;
          } catch {}
          return path;
        },
      },
    },
  },
});
