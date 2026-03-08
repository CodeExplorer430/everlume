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
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage/unit',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/test/**',
        'src/app/**/favicon.ico',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
