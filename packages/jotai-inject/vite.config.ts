import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: './src/index.ts'
      },
      formats: ['es', 'cjs']
    },
    outDir: './dist',
    rollupOptions: {
      external: [
        /^jotai/
      ]
    }
  },
  plugins: [
    react(),
    dts()
  ]
})
