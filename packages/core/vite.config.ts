import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        app: './src/app.tsx',
        store: './src/store.ts'
      },
      formats: ['es', 'cjs']
    },
    outDir: './dist',
    rollupOptions: {
      external: [
        /^react/,
        /^react-dom/,
        /^@blocksuite/,
        /^@toeverything/,
        /^jotai/,
        /^yjs/,
        /^jotai-effect/
      ]
    }
  },
  plugins: [
    react(),
    dts()
  ]
})
