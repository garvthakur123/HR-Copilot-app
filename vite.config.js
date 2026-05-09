import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths so Electron can load from dist/index.html
  base: process.env.ELECTRON === 'true' ? './' : '/',
  server: { port: 5173 },
})
