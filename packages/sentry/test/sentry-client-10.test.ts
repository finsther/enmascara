import * as sentry from '@sentry/node';
import { expect, it, vi } from 'vitest';
import {
  describeSentryClient,
  type Sentry,
} from './support/sentry-client-suite.js';

vi.mock('@sentry/node', async () => await import('sentry-node-10'));

describeSentryClient(
  '@sentry/node 10',
  sentry as unknown as Sentry,
  [{ name: 'transactions', options: {} }],
  { enableLogs: true, enableMetrics: true },
);

it('runs against @sentry/node 10', () => {
  expect(sentry.SDK_VERSION).toMatch(/^10\./);
});
