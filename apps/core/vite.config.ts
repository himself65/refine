import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    outDir: '../electron/dist',
  },
  plugins: [
    react(),
    electron({
      vite: {
        build: {
          outDir: '../electron/dist-electron'
        }
      },
      entry: '../electron/src/main.ts'
    })
  ]
})
