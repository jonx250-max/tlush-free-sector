import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        'src/types/**',
        'src/main.tsx',
        'src/i18n/**',
        'src/data/**',
        'api/_lib/**/*.test.ts',
      ],
      // Per-glob thresholds tighten as we move toward Stage E correctness work.
      // Global thresholds stay info-only for now (Stage A is baseline only);
      // Stage B will tighten and make CI fail on regression.
      thresholds: {
        'src/services/diff/**': { lines: 70, functions: 70, statements: 70, branches: 60 },
        'src/services/*Calculator.ts': { lines: 70, functions: 70, statements: 70, branches: 60 },
      },
    },
  },
})
