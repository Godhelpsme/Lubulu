import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'core': [
            './src/js/core/roulette.js',
            './src/js/core/calendar.js',
            './src/js/core/statistics.js'
          ],
          'managers': [
            './src/js/storage/storage-manager.js',
            './src/js/auth/auth.js',
            './src/js/ui/ui-manager.js'
          ]
        }
      }
    }
  },

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.lubulu\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 3600
              }
            }
          }
        ]
      }
    })
  ],

  server: {
    port: 3000,
    host: true
  }
});
