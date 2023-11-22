import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import istanbul from 'vite-plugin-istanbul'

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: {
        index: './src/index.ts',
        decrypt: './src/decrypt.ts',
        encrypt: './src/encrypt.ts'
      },
      formats: ['es', 'cjs']
    },
    outDir: './dist',
    rollupOptions: {
      external: [
        'yjs',
        'lib0',
        '@endo/base64'
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
