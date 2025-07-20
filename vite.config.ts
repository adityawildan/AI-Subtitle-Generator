import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This is important for Vercel.
    // It ensures that the output directory is compatible with Vercel's expectations.
    outDir: 'dist',
  },
})
