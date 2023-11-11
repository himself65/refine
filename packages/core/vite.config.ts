import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import istanbul from 'vite-plugin-istanbul';

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: {
        components: './src/components.tsx',
        store: './src/store.ts',
        'store/preference': './src/store/preference.ts',
      },
      formats: ['es', 'cjs']
    },
    outDir: './dist',
    rollupOptions: {
      external: [
        /^react/,
        /^react-dom/,
        /^@blocksuite/,
        /^@toeverything/,
        /^jotai/,
        /^yjs/,
        /^jotai-effect/,
        /^y-utility/,
        'uuid',
        /^foxact/,
        'idb'
      ]
    }
  },
  plugins: [
    istanbul({
      forceBuildInstrument: process.env.COVERAGE === 'true'
    }),
    react(),
    dts({
      include: [
        'src'
      ]
    })
  ]
})
