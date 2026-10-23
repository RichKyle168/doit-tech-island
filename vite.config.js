import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// npm run build           → dist/            the site (static files, deployed to Vercel)
// npm run build:artifact  → dist-artifact/   one self-contained HTML file (a preview page)
export default defineConfig(({ mode }) => (mode === 'artifact'
  ? {
    plugins: [react(), viteSingleFile()],
    build: { outDir: 'dist-artifact', target: 'es2019', cssCodeSplit: false, assetsInlineLimit: 100000000 },
  }
  : {
    plugins: [react()],
    build: {
      outDir: 'dist',
      target: 'es2020',
      chunkSizeWarningLimit: 900,
      rollupOptions: { output: { manualChunks: { three: ['three'] } } },
    },
    optimizeDeps: { entries: ['index.html'] },
    server: { watch: { ignored: ['**/dist-artifact/**'] } },
  }));
