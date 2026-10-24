import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this repository under /SlowSleep/.
  // Keep local development at / while the Pages workflow opts into the repo base.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
})
