import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    define: { __SINGLE__: JSON.stringify(single) },
    base: single ? './' : '/',
    build: single ? { outDir: 'dist-single', copyPublicDir: false, chunkSizeWarningLimit: 4000 } : {},
    test: { environment: 'node', include: ['src/**/*.test.ts', 'tests/**/*.test.ts'], globals: false },
  }
})
