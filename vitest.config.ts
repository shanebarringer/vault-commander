import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      // Exclude API clients (integration tested, not unit tested)
      exclude: ['src/**/*.tsx', 'src/__tests__/**', 'src/lib/todoist.ts'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    setupFiles: ['src/__tests__/setup.ts'],
    alias: {
      '@raycast/api': resolve(__dirname, 'src/__tests__/mocks/raycast-api.ts'),
    },
  },
})
