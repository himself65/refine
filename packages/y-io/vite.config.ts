import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        'sync-provider': './src/sync-provider/index.ts',
        'server': './src/server/index.ts'
      },
      formats: ['es', 'cjs']
    },
    outDir: './dist',
    rollupOptions: {
      external: [
        /^jotai/,
        /^socket/,
        /^yjs/
      ]
    }
  },
  plugins: [
    dts({
      include: ["src"],
    })
  ]
})
