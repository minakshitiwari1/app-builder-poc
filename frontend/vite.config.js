import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const target = (env.VITE_API_BASE || 'http://localhost:8081/retail-service').replace(/\/$/, '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/__retail': {
          target,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/__retail/, ''),
          // The browser calls Vite on the same origin; this server-to-server
          // request should not be treated as a cross-origin browser request.
          configure: proxy => proxy.on('proxyReq', request => request.removeHeader('origin')),
        },
      },
    },
  }
})
