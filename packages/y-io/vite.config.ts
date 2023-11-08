import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import istanbul from 'vite-plugin-istanbul';

export default defineConfig({
  build: {
    sourcemap: true,
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
        /^yjs/,
        /^y-utils/
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
