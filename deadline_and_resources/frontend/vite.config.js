import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/app/',
  plugins: [react()],
  server: {
    port: 5173,
    open: '/app',
    // proxy: { '/api': 'http://localhost:3000' }, // adjust to backend
  },
  preview: { port: 5173 },
  build: { outDir: 'dist' },
})
