import { defineConfig } from 'vitest/config';

const MINIMUM_CORE_COVERAGE_PERCENT = 95;

export default defineConfig({
  test: {
    projects: ['packages/*', 'examples/*', 'spec', 'bench', 'tools/*'],
    coverage: {
      provider: 'v8',
      include: [
        'packages/*/src/**/*.ts',
        'spec/tools/**/*.ts',
        'tools/*/src/**/*.ts',
      ],
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
