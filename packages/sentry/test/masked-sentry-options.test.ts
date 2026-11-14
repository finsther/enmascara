import type { Breadcrumb, ErrorEvent } from '@sentry/node';
import { createRedactor, type Redactor } from 'enmascara';
import { describe, expect, it } from 'vitest';
import { maskedSentryOptions } from '../src/index.js';

const CLABE = '002180032240946700';
const CURP = 'GODE561231HDFRRN00';
const RFC = 'GODE561231GR8';
const CARD = '4242424242424242';
const RAW_IDENTIFIERS = [CLABE, CURP, RFC, CARD] as const;

const EVENT_ID_KEY = 'event_id';
const TRACE_ID_KEY = 'trace_id';
const SPAN_ID_KEY = 'span_id';
const PARENT_SPAN_ID_KEY = 'parent_span_id';
const QUERY_STRING_KEY = 'query_string';

const EVENT_ID_WITH_CARD_DIGITS = '00fa0b031b4269506469985117bbaad2';
const TRACE_ID_WITH_CLABE_DIGITS = 'fae6d49ad5c154010716903649688f8a';
const SPAN_ID_WITH_CARD_DIGITS = '4111111111111111';
const PARENT_SPAN_ID_WITH_CARD_DIGITS = '5555555555554444';

const redact = createRedactor();

function errorEvent(): ErrorEvent {
  return {
    type: undefined,
    [EVENT_ID_KEY]: EVENT_ID_WITH_CARD_DIGITS,
    message: `SPEI a ${CLABE}`,
    exception: {
      values: [
        {
          type: 'Error',
          value: `RFC ${RFC} inválido`,
          stacktrace: {
            frames: [
              { function: 'pagar', vars: { curp: CURP, tarjeta: CARD } },
            ],
          },
        },
      ],
    },
    request: {
      url: `https://api.example.mx/cuentas/${CLABE}`,
      [QUERY_STRING_KEY]: `curp=${CURP}`,
      data: { tarjeta: CARD },
      headers: { 'x-rfc': RFC },
      cookies: { curp: CURP },
    },
    extra: { clabe: CLABE },
    contexts: {
      trace: {
        [TRACE_ID_KEY]: TRACE_ID_WITH_CLABE_DIGITS,
        [SPAN_ID_KEY]: SPAN_ID_WITH_CARD_DIGITS,
        [PARENT_SPAN_ID_KEY]: PARENT_SPAN_ID_WITH_CARD_DIGITS,
      },
      pago: { tarjeta: CARD },
    },
    user: { id: CURP },
    tags: { rfc: RFC },
    breadcrumbs: [{ message: `cargo a ${CARD}`, data: { clabe: CLABE } }],
    transaction: `/cuentas/${CLABE}`,
  };
}

function failingRedactor(): Redactor {
  const fail = (): never => {
    throw new Error('masking failed');
  };
  return { text: fail, object: fail, findings: () => [] };
}

function redactorReturning(value: unknown): Redactor {
  return {
    text: () => '[TEXT]',
    object: () => value,
    findings: () => [],
  };
}

function asSent(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function expectNoRawIdentifier(value: unknown): void {
  const serialized = JSON.stringify(value);
  for (const identifier of RAW_IDENTIFIERS) {
    expect(serialized).not.toContain(identifier);
  }
}

describe('maskedSentryOptions', () => {
  it('masks identifiers in every field of an error event', async () => {
    const { beforeSend } = maskedSentryOptions(redact, {});

    const sent = await beforeSend(errorEvent(), {});

    expect(asSent(sent)).toMatchObject({
      message: 'SPEI a [CLABE]',
      exception: {
        values: [
          {
            value: 'RFC [RFC] inválido',
            stacktrace: {
              frames: [{ vars: { curp: '[CURP]', tarjeta: '[CARD]' } }],
            },
          },
        ],
      },
      request: {
        url: 'https://api.example.mx/cuentas/[CLABE]',
        [QUERY_STRING_KEY]: 'curp=[CURP]',
        data: { tarjeta: '[CARD]' },
        headers: { 'x-rfc': '[RFC]' },
        cookies: { curp: '[CURP]' },
      },
      extra: { clabe: '[CLABE]' },
      contexts: { pago: { tarjeta: '[CARD]' } },
      user: { id: '[CURP]' },
      tags: { rfc: '[RFC]' },
      breadcrumbs: [{ message: 'cargo a [CARD]', data: { clabe: '[CLABE]' } }],
      transaction: '/cuentas/[CLABE]',
    });
    expectNoRawIdentifier(sent);
  });

  it('keeps the identifiers Sentry generates for the event and its trace', async () => {
    const { beforeSend } = maskedSentryOptions(redact, {});

    const sent = await beforeSend(errorEvent(), {});

    expect(asSent(sent)).toMatchObject({
      [EVENT_ID_KEY]: EVENT_ID_WITH_CARD_DIGITS,
      contexts: {
        trace: {
          [TRACE_ID_KEY]: TRACE_ID_WITH_CLABE_DIGITS,
          [SPAN_ID_KEY]: SPAN_ID_WITH_CARD_DIGITS,
          [PARENT_SPAN_ID_KEY]: PARENT_SPAN_ID_WITH_CARD_DIGITS,
        },
      },
    });
  });

  it('masks trace identifiers that Sentry did not generate', async () => {
    const { beforeSend } = maskedSentryOptions(redact, {});
    const event: ErrorEvent = {
      type: undefined,
      [EVENT_ID_KEY]: `evento ${CURP}`,
      contexts: {
        trace: { [TRACE_ID_KEY]: CURP, [SPAN_ID_KEY]: `span ${RFC}` },
      },
    };

    const sent = await beforeSend(event, {});

    expect(asSent(sent)).toMatchObject({
      [EVENT_ID_KEY]: 'evento [CURP]',
      contexts: {
        trace: { [TRACE_ID_KEY]: '[CURP]', [SPAN_ID_KEY]: 'span [RFC]' },
      },
    });
  });

  it('leaves the original event untouched', async () => {
    const { beforeSend } = maskedSentryOptions(redact, {});
    const event = errorEvent();

    await beforeSend(event, {});

    expect(event).toEqual(errorEvent());
  });

  it('runs the beforeSend of the application before masking', async () => {
    const { beforeSend } = maskedSentryOptions(redact, {
      beforeSend: (event) => ({ ...event, extra: { cuenta: CLABE } }),
    });

    const sent = await beforeSend(errorEvent(), {});

    expect(asSent(sent)).toMatchObject({ extra: { cuenta: '[CLABE]' } });
  });

  it('awaits an asynchronous beforeSend of the application', async () => {
    const { beforeSend } = maskedSentryOptions(redact, {
      beforeSend: async (event) => ({ ...event, tags: { curp: CURP } }),
    });

    const sent = await beforeSend(errorEvent(), {});

    expect(asSent(sent)).toMatchObject({ tags: { curp: '[CURP]' } });
    expectNoRawIdentifier(sent);
  });

  it.each([
    ['synchronously', () => null],
    ['asynchronously', async () => null],
  ])('drops the event when the application drops it %s', async (_, drop) => {
    const { beforeSend } = maskedSentryOptions(redact, { beforeSend: drop });

    expect(await beforeSend(errorEvent(), {})).toBeNull();
  });

  it('answers synchronously when the hooks of the application do', () => {
    const { beforeSend } = maskedSentryOptions(redact, {
      beforeSend: (event) => event,
    });

    const sent = beforeSend(errorEvent(), {});

    expect(sent).not.toBeInstanceOf(Promise);
    expect(asSent(sent)).toMatchObject({ message: 'SPEI a [CLABE]' });
  });

  it('sends an event whose trace context is not an object', async () => {
    const { beforeSend } = maskedSentryOptions(redact, {});
    const event = {
      ...errorEvent(),
      contexts: { trace: null },
    } as unknown as ErrorEvent;

    const sent = await beforeSend(event, {});

    expect(asSent(sent)).toMatchObject({
      [EVENT_ID_KEY]: EVENT_ID_WITH_CARD_DIGITS,
      contexts: { trace: null },
      message: 'SPEI a [CLABE]',
    });
  });

  it('masks identifiers in breadcrumbs', () => {
    const { beforeBreadcrumb } = maskedSentryOptions(redact, {});
    const breadcrumb: Breadcrumb = {
      category: 'pago',
      message: `SPEI a ${CLABE}`,
      data: { curp: CURP, url: `/tarjetas/${CARD}` },
    };

    const recorded = beforeBreadcrumb(breadcrumb);

    expect(asSent(recorded)).toEqual({
      category: 'pago',
      message: 'SPEI a [CLABE]',
      data: { curp: '[CURP]', url: '/tarjetas/[CARD]' },
    });
    expect(breadcrumb.message).toBe(`SPEI a ${CLABE}`);
  });

  it('runs the beforeBreadcrumb of the application before masking', () => {
    const { beforeBreadcrumb } = maskedSentryOptions(redact, {
      beforeBreadcrumb: (breadcrumb, hint) => ({
        ...breadcrumb,
        data: { rfc: RFC, hint },
      }),
    });

    const recorded = beforeBreadcrumb({ message: 'pago' }, { level: 2 });

    expect(asSent(recorded)).toEqual({
      message: 'pago',
      data: { rfc: '[RFC]', hint: { level: 2 } },
    });
  });

  it('drops the breadcrumb when the application drops it', () => {
    const { beforeBreadcrumb } = maskedSentryOptions(redact, {
      beforeBreadcrumb: () => null,
    });

    expect(beforeBreadcrumb({ message: CLABE })).toBeNull();
  });

  it.each([
    ['throws', failingRedactor()],
    ['returns text', redactorReturning('[TEXT]')],
    ['returns null', redactorReturning(null)],
  ])(
    'drops events and breadcrumbs when the redactor %s',
    async (_, redactor) => {
      const { beforeSend, beforeBreadcrumb } = maskedSentryOptions(
        redactor,
        {},
      );

      expect(await beforeSend(errorEvent(), {})).toBeNull();
      expect(beforeBreadcrumb({ message: CLABE })).toBeNull();
    },
  );

  it('keeps the other options and leaves them untouched', () => {
    const applicationBeforeSend = (event: ErrorEvent) => event;
    const options = {
      dsn: 'https://public@example.invalid/1',
      sampleRate: 0.5,
      beforeSend: applicationBeforeSend,
    };

    const masked = maskedSentryOptions(redact, options);

    expect(masked).toMatchObject({
      dsn: 'https://public@example.invalid/1',
      sampleRate: 0.5,
    });
    expect(masked.beforeSend).not.toBe(applicationBeforeSend);
    expect(options).toEqual({
      dsn: 'https://public@example.invalid/1',
      sampleRate: 0.5,
      beforeSend: applicationBeforeSend,
    });
  });
});
