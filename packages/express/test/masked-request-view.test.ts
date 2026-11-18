import { createRedactor } from 'enmascara';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { maskedRequestView } from '../src/index.js';
import { EXPRESS_VERSIONS, sendTo } from './support/express-server.js';
import {
  CARD,
  CLABE,
  CREDENTIAL,
  CURP,
  failingRedactor,
  RAW_IDENTIFIERS,
  RFC,
  redactorReturning,
} from './support/identifiers.js';

const REDACTED_VIEW = { enmascara: '[REDACTED]' };
const CREDENTIAL_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
] as const;

const redact = createRedactor();

interface RequestSnapshot {
  readonly keys: readonly string[];
  readonly body: unknown;
  readonly query: unknown;
  readonly params: unknown;
  readonly headers: unknown;
}

function snapshotOf(request: Request): RequestSnapshot {
  return {
    keys: Reflect.ownKeys(request).map(String),
    body: structuredClone(request.body),
    query: structuredClone({ ...request.query }),
    params: structuredClone({ ...request.params }),
    headers: structuredClone(request.headers),
  };
}

describe('maskedRequestView', () => {
  it('masks the method, URL, params, query, headers and body', () => {
    const view = maskedRequestView(redact, {
      method: 'POST',
      url: `/api/cuentas/${CLABE}?curp=${CURP}`,
      params: { clabe: CLABE },
      query: { curp: CURP },
      headers: { 'x-rfc': RFC },
      body: { tarjeta: CARD },
    });

    expect(view).toEqual({
      method: 'POST',
      url: '/api/cuentas/[CLABE]?curp=[CURP]',
      params: { clabe: '[CLABE]' },
      query: { curp: '[CURP]' },
      headers: { 'x-rfc': '[RFC]' },
      body: { tarjeta: '[CARD]' },
    });
  });

  it('prefers the original URL to the one a router rewrote', () => {
    const view = maskedRequestView(redact, {
      url: '/cuentas',
      originalUrl: `/api/cuentas?curp=${CURP}`,
    });

    expect(view).toMatchObject({ url: '/api/cuentas?curp=[CURP]' });
  });

  it.each(CREDENTIAL_HEADERS.flatMap((name) => [name, name.toUpperCase()]))(
    'replaces the value of the credential header %s',
    (name) => {
      const view = maskedRequestView(redact, {
        headers: { [name]: CREDENTIAL, accept: 'application/json' },
      });

      expect(view).toMatchObject({
        headers: { [name]: '[REDACTED]', accept: 'application/json' },
      });
    },
  );

  it('replaces every value of a repeated credential header', () => {
    const view = maskedRequestView(redact, {
      headers: { 'set-cookie': [CREDENTIAL, CREDENTIAL] },
    });

    expect(view).toMatchObject({ headers: { 'set-cookie': '[REDACTED]' } });
  });

  it('leaves the request it reads untouched', () => {
    const headers = { 'x-rfc': RFC };
    const request = { url: `/api?curp=${CURP}`, headers };

    maskedRequestView(redact, request);

    expect(request).toEqual({ url: `/api?curp=${CURP}`, headers });
    expect(headers).toEqual({ 'x-rfc': RFC });
  });

  it('fails closed when the redactor throws', () => {
    expect(maskedRequestView(failingRedactor(), { url: CURP })).toEqual(
      REDACTED_VIEW,
    );
  });

  it('fails closed when the redactor returns something other than an object', () => {
    expect(maskedRequestView(redactorReturning(CURP), { url: CURP })).toEqual(
      REDACTED_VIEW,
    );
  });

  it('fails closed when the masked headers are not an object', () => {
    expect(
      maskedRequestView(redactorReturning({ headers: CURP }), { url: CURP }),
    ).toEqual(REDACTED_VIEW);
  });
});

describe.each(EXPRESS_VERSIONS)('maskedRequestView on %s', (_, express) => {
  async function viewAndSnapshots(): Promise<{
    readonly view: unknown;
    readonly before: RequestSnapshot;
    readonly after: RequestSnapshot;
  }> {
    const captured: {
      view?: unknown;
      before?: RequestSnapshot;
      after?: RequestSnapshot;
    } = {};
    const app = express();
    app.use(express.json());
    app.post('/api/cuentas/:clabe', (request, response) => {
      captured.before = snapshotOf(request);
      captured.view = maskedRequestView(redact, request);
      captured.after = snapshotOf(request);
      response.sendStatus(204);
    });

    await sendTo(app, {
      method: 'POST',
      path: `/api/cuentas/${CLABE}?curp=${CURP}`,
      headers: { 'x-rfc': RFC, authorization: CREDENTIAL },
      body: { tarjeta: CARD },
    });

    const { view, before, after } = captured;
    if (before === undefined || after === undefined) {
      throw new Error('the route did not run');
    }
    return { view, before, after };
  }

  it('masks what Express parsed from a real request', async () => {
    const { view } = await viewAndSnapshots();

    expect(view).toMatchObject({
      method: 'POST',
      url: '/api/cuentas/[CLABE]?curp=[CURP]',
      params: { clabe: '[CLABE]' },
      query: { curp: '[CURP]' },
      headers: { 'x-rfc': '[RFC]', authorization: '[REDACTED]' },
      body: { tarjeta: '[CARD]' },
    });
  });

  it('never writes a raw identifier or the credential', async () => {
    const written = JSON.stringify((await viewAndSnapshots()).view);

    for (const value of [...RAW_IDENTIFIERS, CREDENTIAL]) {
      expect(written).not.toContain(value);
    }
  });

  it('leaves req exactly as Express built it', async () => {
    const { before, after } = await viewAndSnapshots();

    expect(after).toEqual(before);
  });
});
