import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import istanbul from 'vite-plugin-istanbul'

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: {
        server: './src/server.ts'
      },
      formats: ['es', 'cjs']
    },
    outDir: './dist',
    rollupOptions: {
      external: [
        /^yjs/,
        /^y-utils/,
        /^drizzle-orm/,
        /^better-sqlite3/
      ]
    }
  },
  plugins: [
    istanbul({
      forceBuildInstrument: process.env.COVERAGE === 'true'
    }),
    dts({
      include: ['src']
    })
  ]
})
