import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/core/test/**/*.test.ts', 'spec/test/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'packages/core/test/fuzzing.test.ts'],
  },
});
