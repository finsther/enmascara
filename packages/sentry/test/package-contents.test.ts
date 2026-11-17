import { describeIntegrationPackage } from '../../core/test/support/integration-package.js';

describeIntegrationPackage({
  directory: 'packages/sentry',
  sdk: '@sentry/node',
});
