import * as Sentry from '@sentry/node';
import { createRedactor } from 'enmascara';
import { maskedSentryOptions } from 'enmascara-sentry';

const EXAMPLE_DSN = 'https://public@example.invalid/1';
const SUCCESS_STATUS_CODE = 200;

type TransportOptions = Parameters<typeof Sentry.createTransport>[0];

function envelopeText(body: string | Uint8Array): string {
  return typeof body === 'string' ? body : new TextDecoder().decode(body);
}

function printEvents(envelope: string): void {
  const [, ...lines] = envelope.split('\n');
  lines.forEach((line, index) => {
    const payload = lines[index + 1];
    if (line.includes('"type":"event"') && payload !== undefined) {
      process.stdout.write(`${payload}\n`);
    }
  });
}

function printingTransport(options: TransportOptions) {
  return Sentry.createTransport(options, async (request) => {
    printEvents(envelopeText(request.body));
    return { statusCode: SUCCESS_STATUS_CODE };
  });
}

Sentry.init(
  maskedSentryOptions(createRedactor(), {
    dsn: EXAMPLE_DSN,
    defaultIntegrations: false,
    sendClientReports: false,
    transport: printingTransport,
  }),
);

Sentry.setUser({ id: 'GODE561231HDFRRN00' });
Sentry.setContext('pago', { tarjeta: '4242 4242 4242 4242' });
Sentry.addBreadcrumb({
  category: 'spei',
  message: 'transferencia a 002180032240946700',
});
Sentry.captureException(
  new Error('RFC GODE561231GR8 no coincide con el beneficiario'),
);

await Sentry.close();
