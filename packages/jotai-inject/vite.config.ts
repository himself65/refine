import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import istanbul from 'vite-plugin-istanbul';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: './src/index.ts'
      },
      formats: ['es', 'cjs']
    },
    outDir: './dist',
    rollupOptions: {
      external: [
        /^jotai/,
        /^react/
      ]
    }
  },
  plugins: [
    istanbul({
      forceBuildInstrument: process.env.COVERAGE === 'true'
    }),
    dts({
      include: ["src"],
    })
  ]
})
