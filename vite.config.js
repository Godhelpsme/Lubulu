import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'esbuild'
  },

  server: {
    port: 5173,
    host: true
  }
});