import * as sentry from '@sentry/node';
import { expect, it } from 'vitest';
import { describeSentryClient } from './support/sentry-client-suite.js';

describeSentryClient('@sentry/node 11', sentry, [
  { name: 'streamed spans', options: {} },
  { name: 'static spans', options: { traceLifecycle: 'static' } },
]);

it('runs against @sentry/node 11', () => {
  expect(sentry.SDK_VERSION).toMatch(/^11\./);
});
