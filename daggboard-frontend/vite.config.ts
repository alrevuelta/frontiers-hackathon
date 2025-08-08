import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/table': {
        target: 'http://65.21.69.162:3000',
        changeOrigin: true,
        secure: false,
      },
      '/bridge_balance': {
        target: 'http://65.21.69.162:3000',
        changeOrigin: true,
        secure: false,
      },
      '/wrapped_balance': {
        target: 'http://65.21.69.162:3000',
        changeOrigin: true,
        secure: false,
      },
      '/sync': {
        target: 'http://65.21.69.162:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
