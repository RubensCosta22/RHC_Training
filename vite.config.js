import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  preview: {
    allowedHosts: ['rhc-training-v2-preview.onrender.com']
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'RHC Training',
        short_name: 'RHC Training',
        description: 'Seu treino, organizado.',
        theme_color: '#0A0A0B',
        background_color: '#0A0A0B',
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
