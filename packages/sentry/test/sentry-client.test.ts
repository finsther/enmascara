import * as sentryEleven from '@sentry/node';
import { createRedactor, type Redactor } from 'enmascara';
import * as sentryTen from 'sentry-node-10';
import { afterEach, describe, expect, it } from 'vitest';
import { maskedSentryOptions } from '../src/index.js';

const CLABE = '002180032240946700';
const CURP = 'GODE561231HDFRRN00';
const RFC = 'GODE561231GR8';
const CARD = '4242424242424242';
const RAW_IDENTIFIERS = [CLABE, CURP, RFC, CARD] as const;
const UNREACHABLE_DSN = 'https://public@example.invalid/1';

type Sentry = typeof sentryEleven;

const SENTRY_VERSIONS = [
  ['@sentry/node 11', sentryEleven],
  ['@sentry/node 10', sentryTen as unknown as Sentry],
] as const;

const redact = createRedactor();

function failingRedactor(): Redactor {
  const fail = (): never => {
    throw new Error('masking failed');
  };
  return { text: fail, object: fail, findings: () => [] };
}

interface CapturedEnvelopes {
  readonly items: (type: string) => readonly unknown[];
  readonly raw: () => string;
}

function startSentry(sentry: Sentry, redactor: Redactor): CapturedEnvelopes {
  const bodies: string[] = [];
  const decoder = new TextDecoder();
  sentry.init(
    maskedSentryOptions(redactor, {
      dsn: UNREACHABLE_DSN,
      defaultIntegrations: false,
      sendClientReports: false,
      transport: (options) =>
        sentry.createTransport(options, async (request) => {
          bodies.push(
            typeof request.body === 'string'
              ? request.body
              : decoder.decode(request.body),
          );
          return { statusCode: 200 };
        }),
    }),
  );
  const envelopeItems = (): readonly (readonly [unknown, unknown])[] =>
    bodies.flatMap((body) => {
      const [, ...lines] = body.split('\n').filter((line) => line !== '');
      return lines.flatMap((line, index) =>
        index % 2 === 0
          ? [
              [
                JSON.parse(line),
                JSON.parse(lines[index + 1] ?? 'null'),
              ] as const,
            ]
          : [],
      );
    });
  return {
    items: (type) =>
      envelopeItems()
        .filter(([header]) => (header as { type?: string }).type === type)
        .map(([, payload]) => payload),
    raw: () => bodies.join('\n'),
  };
}

describe.each(SENTRY_VERSIONS)('maskedSentryOptions with %s', (_, sentry) => {
  afterEach(async () => {
    await sentry.close();
    sentry.getIsolationScope().clearBreadcrumbs();
    sentry.getCurrentScope().clearBreadcrumbs();
  });

  it('sends error events masked through the transport', async () => {
    const envelopes = startSentry(sentry, redact);

    sentry.setUser({ id: CURP });
    sentry.setExtra('clabe', CLABE);
    sentry.setContext('pago', { tarjeta: CARD });
    sentry.addBreadcrumb({ message: `SPEI a ${CLABE}` });
    sentry.captureException(new Error(`RFC ${RFC} inválido`));
    sentry.captureMessage(`cargo a ${CARD}`);
    await sentry.flush();

    expect(envelopes.items('event')).toMatchObject([
      {
        exception: { values: [{ value: 'RFC [RFC] inválido' }] },
        user: { id: '[CURP]' },
        extra: { clabe: '[CLABE]' },
        contexts: { pago: { tarjeta: '[CARD]' } },
        breadcrumbs: [{ message: 'SPEI a [CLABE]' }],
      },
      { message: 'cargo a [CARD]' },
    ]);
    for (const identifier of RAW_IDENTIFIERS) {
      expect(envelopes.raw()).not.toContain(identifier);
    }
  });

  it('records breadcrumbs already masked', () => {
    startSentry(sentry, redact);

    sentry.addBreadcrumb({ message: `SPEI a ${CLABE}`, data: { curp: CURP } });

    expect(sentry.getIsolationScope().getScopeData().breadcrumbs).toMatchObject(
      [{ message: 'SPEI a [CLABE]', data: { curp: '[CURP]' } }],
    );
  });

  it('sends nothing when masking fails', async () => {
    const envelopes = startSentry(sentry, failingRedactor());

    sentry.addBreadcrumb({ message: `SPEI a ${CLABE}` });
    sentry.captureException(new Error(`RFC ${RFC} inválido`));
    await sentry.flush();

    expect(envelopes.raw()).toBe('');
    expect(sentry.getIsolationScope().getScopeData().breadcrumbs).toEqual([]);
  });
});
