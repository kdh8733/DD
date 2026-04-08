import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: env.VITE_API_BASE_URL || 'http://localhost:8080', changeOrigin: true },
        '/ws': { target: env.VITE_WS_BASE_URL || 'ws://localhost:8080', ws: true, changeOrigin: true }
      }
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1000
    }
  }
})
