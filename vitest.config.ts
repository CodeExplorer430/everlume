import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  server: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15000,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage/unit',
      include: [
        'src/components/ui/button.tsx',
        'src/components/ui/input.tsx',
        'src/lib/cloudinary.ts',
        'src/lib/utils/cn.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
