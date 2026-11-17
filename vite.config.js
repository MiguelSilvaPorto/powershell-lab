import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { realPowerShellPlugin } from './server/viteRealPowerShellPlugin.mjs'

export default defineConfig({
  plugins: [react(), realPowerShellPlugin()],
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
})
