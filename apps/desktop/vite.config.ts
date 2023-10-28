import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: './src/electron/main.ts'
    })
  ]
})
