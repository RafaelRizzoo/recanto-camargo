import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/recanto-camargo/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})