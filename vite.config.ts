import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'vite.svg'],
      manifest: {
        name: 'Domain Designer',
        short_name: 'DomainDesigner',
        start_url: mode === 'production' && process.env.GITHUB_PAGES ? '/domain-designer/' : '/',
        scope: mode === 'production' && process.env.GITHUB_PAGES ? '/domain-designer/' : '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        orientation: 'any',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'pwa-icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/]
      }
    })
  ],
  base: mode === 'production' && process.env.GITHUB_PAGES ? '/domain-designer/' : '/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}))