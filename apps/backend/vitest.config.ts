import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/vitest.setup.ts',
        '**/src/infrastructure/db/migrations/**',
        '**/src/infrastructure/db/seeds/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@openapi': path.resolve(__dirname, '../../packages/openapi/dist'),
    },
  },
})
