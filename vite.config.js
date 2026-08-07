import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/webtools/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'WebTools',
        short_name: 'WebTools',
        description: 'Offline-capable WebTools suite',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        display_override: ['window-controls-overlay'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 50000000, // 50MB
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      }
    })
  ],
  build: {
    rolldownOptions: {
      external: ['onnxruntime-web/webgpu', 'onnxruntime-web']
    },
    rollupOptions: {
      external: ['onnxruntime-web/webgpu', 'onnxruntime-web']
    }
  }
})
