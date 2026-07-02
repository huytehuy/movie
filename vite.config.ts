import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-64x64.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Huytehuy Movies',
        short_name: 'Huytehuy',
        description: 'Xem phim mới cập nhật',
        lang: 'vi',
        start_url: '/',
        display: 'standalone',
        theme_color: '#1a1b1e',
        background_color: '#1a1b1e',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // API phim: ưu tiên mạng, offline thì dùng cache (tối đa 1 ngày)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/phim\.nguonc\.com\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nguonc-api',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/ophim1\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ophim-api',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Ảnh poster: cache trước, hết hạn sau 30 ngày
          {
            urlPattern: /^https:\/\/(phim\.nguonc\.com\/public\/images|img\.ophim\.live)\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'movie-images',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 30 * 24 * 60 * 60,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
