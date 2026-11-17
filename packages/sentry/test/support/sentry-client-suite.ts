import type * as sentryModule from '@sentry/node';
import type { NodeOptions } from '@sentry/node';
import { createRedactor, type Redactor } from 'enmascara';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { maskedSentryOptions } from '../../src/index.js';

export type Sentry = typeof sentryModule;

const CLABE = '002180032240946700';
const CURP = 'GODE561231HDFRRN00';
const RFC = 'GODE561231GR8';
const CARD = '4242424242424242';
const RAW_IDENTIFIERS = [CLABE, CURP, RFC, CARD] as const;
const UNREACHABLE_DSN = 'https://public@example.invalid/1';

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
  readonly headers: () => string;
  readonly payloads: () => string;
}

export type TracingOptions = Pick<
  NodeOptions,
  'tracesSampleRate' | 'traceLifecycle'
>;

export interface TracingSetup {
  readonly name: string;
  readonly options: TracingOptions;
}

function startSentry(
  sentry: Sentry,
  redactor: Redactor,
  tracingOptions: TracingOptions = {},
): CapturedEnvelopes {
  const bodies: string[] = [];
  const decoder = new TextDecoder();
  sentry.init(
    maskedSentryOptions(redactor, {
      ...tracingOptions,
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
    headers: () => bodies.map((body) => body.split('\n')[0]).join('\n'),
    payloads: () =>
      bodies.map((body) => body.split('\n').slice(1).join('\n')).join('\n'),
  };
}

function traceRequest(sentry: Sentry): void {
  sentry.startSpan(
    { name: `GET /cuentas/${CLABE}`, attributes: { curp: CURP } },
    () => {
      sentry.startSpan({ name: `cobro a ${CARD}` }, () => undefined);
    },
  );
}

export function describeSentryClient(
  version: string,
  sentry: Sentry,
  tracingSetups: readonly TracingSetup[],
): void {
  describe.each(
    tracingSetups.map((setup) => [setup.name, setup.options] as const),
  )(`maskedSentryOptions tracing with ${version} and %s`, (_, lifecycle) => {
    afterEach(async () => {
      await sentry.close();
    });

    it('sends span and transaction payloads masked', async () => {
      const envelopes = startSentry(sentry, redact, {
        tracesSampleRate: 1,
        ...lifecycle,
      });

      traceRequest(sentry);
      await sentry.flush();

      expect(envelopes.payloads()).toContain('GET /cuentas/[CLABE]');
      expect(envelopes.payloads()).toContain('cobro a [CARD]');
      for (const identifier of RAW_IDENTIFIERS) {
        expect(envelopes.payloads()).not.toContain(identifier);
      }
    });

    it('starts without Sentry warnings', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      startSentry(sentry, redact, { tracesSampleRate: 1, ...lifecycle });

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('sends envelope headers without identifiers', async () => {
      const envelopes = startSentry(sentry, redact, {
        tracesSampleRate: 1,
        ...lifecycle,
      });

      traceRequest(sentry);
      await sentry.flush();

      expect(envelopes.headers()).not.toBe('');
      for (const identifier of RAW_IDENTIFIERS) {
        expect(envelopes.headers()).not.toContain(identifier);
      }
    });
  });

  describe(`maskedSentryOptions with ${version}`, () => {
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

      sentry.addBreadcrumb({
        message: `SPEI a ${CLABE}`,
        data: { curp: CURP },
      });

      expect(
        sentry.getIsolationScope().getScopeData().breadcrumbs,
      ).toMatchObject([
        { message: 'SPEI a [CLABE]', data: { curp: '[CURP]' } },
      ]);
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
}
