import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    outDir: '../desktop/dist',
  },
  plugins: [
    react(),
    electron({
      vite: {
        build: {
          outDir: '../desktop/dist-electron'
        }
      },
      entry: '../desktop/src/main.ts'
    })
  ]
})
