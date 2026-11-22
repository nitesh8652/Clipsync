import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Logo.png'],
      manifest: {
        name: 'ClipSync',
        short_name: 'ClipSync',
        description: 'Your personalized clipboard across devices',
        theme_color: '#1F1F1E',
        background_color: '#1F1F1E',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/clips',
        icons: [
          { src: '/Logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/Logo.png', sizes: '512x512', type: 'image/png' },
          { src: '/Logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
