import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import istanbul from 'vite-plugin-istanbul'

export default defineConfig({
  resolve: {
    alias: {
      'yjs/src/internals.js': './node_modules/yjs/src/internals.js'
    }
  },
  build: {
    sourcemap: true,
    lib: {
      entry: {
        index: './src/index.ts'
      },
      formats: ['es', 'cjs']
    },
    outDir: './dist',
    rollupOptions: {
      external: [
        'yjs',
        // yjs/src/internals.js will be inlined
        'lib0'
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
