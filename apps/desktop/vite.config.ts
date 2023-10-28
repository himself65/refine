import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    minify: 'esbuild',
    sourcemap: 'inline'
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: './src/electron/main.ts'
      },
      preload: {
        input: './src/electron/preload.ts'
      }
    })
  ]
})
