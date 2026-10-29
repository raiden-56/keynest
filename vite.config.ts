/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(rawId) {
          const id = rawId.replace(/\\/g, '/')
          if (id.includes('node_modules/@mui') || id.includes('node_modules/@emotion')) return 'mui'
          if (id.includes('node_modules/xlsx')) return 'xlsx'
          if (id.includes('node_modules/@azure')) return 'msal'
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) return 'motion'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})
