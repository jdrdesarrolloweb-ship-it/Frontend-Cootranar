import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Mismo alias que vite.config.ts y tsconfig: '@/...' → src/ (Vite usa este archivo primero).
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5175,
    allowedHosts: ['jaelyn-moldy-tisa.ngrok-free.dev']
  }
})
