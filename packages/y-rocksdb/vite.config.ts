import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import istanbul from 'vite-plugin-istanbul'

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: {
        desktop: './src/desktop.ts'
      },
      formats: ['es', 'cjs']
    },
    outDir: './dist',
    rollupOptions: {
      external: [
        /^yjs/,
        /^y-utils/,
        /^@nxtedition\/rocksdb/,
        /^abstract-level/,
        /^uuid/
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
