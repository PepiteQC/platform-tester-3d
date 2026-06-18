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
      '/api': 'http://localhost:4100',
      '/socket': {
        target: 'ws://localhost:4100',
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
      '@': '/src'
    }
  }
})
