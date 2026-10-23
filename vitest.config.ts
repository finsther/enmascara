import { defineConfig } from 'vitest/config';

const MINIMUM_CORE_COVERAGE_PERCENT = 95;

export default defineConfig({
  test: {
    projects: ['packages/*', 'spec'],
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: MINIMUM_CORE_COVERAGE_PERCENT,
        branches: MINIMUM_CORE_COVERAGE_PERCENT,
        functions: MINIMUM_CORE_COVERAGE_PERCENT,
        statements: MINIMUM_CORE_COVERAGE_PERCENT,
      },
    },
  },
});
