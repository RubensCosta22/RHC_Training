import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Meu Treino TotalPass',
        short_name: 'TreinoTP',
        description: 'Treinos A/B/C com progresso salvo na nuvem.',
        theme_color: '#10b981',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\//,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\//,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ]
})
