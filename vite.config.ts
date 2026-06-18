import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ============================================================
//  Vite Config — EtherWorld React Build
// ============================================================
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket': {
        target: 'ws://localhost:5000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@blinkdotnew/ui': '/src/mocks/blinkdotnew-ui.ts'
    }
  }
})
