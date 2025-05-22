import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  define: {
    global: 'globalThis', // ✅ 여기로 이동! (server 밖으로)
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/images': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/ws': { // ✅ WebSocket 프록시 추가
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true // WebSocket 지원
      }
    }
  }
})