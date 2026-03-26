import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Vite configuration for Ramadan Rhythm Scheduler.
 *
 * Key decisions:
 * - @tailwindcss/vite plugin for zero-config Tailwind v4 integration
 * - VitePWA in generateSW mode for automatic service-worker generation
 * - Offline-first caching: all static assets + API responses cached
 */
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Ramadan Rhythm Scheduler',
        short_name: 'RamadanRhythm',
        description: 'AI-powered Ramadan schedule planner with prayer times & Google Calendar sync',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-192.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Cache AlAdhan API prayer time responses
            urlPattern: /^https:\/\/api\.aladhan\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'prayer-times-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 86400 },
            },
          },
          {
            // Cache Google Calendar API responses
            urlPattern: /^https:\/\/www\.googleapis\.com\/calendar\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gcal-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
            },
          },
        ],
      },
    }),
  ],
});
