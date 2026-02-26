import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: null,
    proxy: {
      '/api': {
        target: process.env.CENTRAL_SERVICE_URL || 'http://central.chat-system.svc.cluster.local:8080',
        changeOrigin: true,
        timeout: 10000,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})

