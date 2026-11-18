import { describeIntegrationPackage } from '../../core/test/support/integration-package.js';

describeIntegrationPackage({
  directory: 'packages/express',
  sdk: 'express',
  optionalPeers: ['morgan', 'pino-http'],
});
