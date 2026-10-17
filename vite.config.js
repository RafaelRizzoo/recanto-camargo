import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serve em /recanto-camargo/; Vercel/Netlify (previews) servem na raiz.
  base: process.env.VERCEL || process.env.NETLIFY ? '/' : '/recanto-camargo/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-bootstrap': ['bootstrap', 'react-bootstrap'],
        }
      }
    }
  }
})