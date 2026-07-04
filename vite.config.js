import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      workbox: {
        // Precache self-hosted fonts so the app renders in Newsreader/Inter offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // The app is English/French only — don't precache subsets it can't display.
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*'],
      },
      manifest: {
        name: 'Lille City Church Bible Study',
        short_name: 'LCC Study',
        description: 'Offline-capable Bible Study App',
        theme_color: '#14131a',
        background_color: '#14131a',
        display: 'standalone',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
  }
})
