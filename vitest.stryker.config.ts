import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/core/test/**/*.test.ts',
      'packages/express/test/**/*.test.ts',
      'packages/pino/test/**/*.test.ts',
      'packages/sentry/test/**/*.test.ts',
      'spec/test/**/*.test.ts',
      'tools/release/test/**/*.test.ts',
      'apps/site/test/inline-sources.test.ts',
      'apps/site/test/content-security-policy.test.ts',
      'apps/site/test/ring/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      'packages/core/test/fuzzing.test.ts',
      'packages/*/test/package-contents.test.ts',
      'packages/core/test/readme.test.ts',
    ],
  },
});
