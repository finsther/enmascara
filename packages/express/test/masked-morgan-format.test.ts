import { createRedactor, type Redactor } from 'enmascara';
import type { Express, Request } from 'express';
import morgan from 'morgan';
import { describe, expect, it } from 'vitest';
import { maskedMorganFormat } from '../src/index.js';
import { capturedOutput } from './support/captured-output.js';
import { EXPRESS_VERSIONS, sendTo } from './support/express-server.js';
import {
  CARD,
  CLABE,
  CREDENTIAL,
  CURP,
  failingRedactor,
  RAW_IDENTIFIERS,
  RFC,
} from './support/identifiers.js';

const ROUTE = '/api/cuentas/:clabe';
const PATH = `/api/cuentas/${CLABE}?curp=${CURP}`;
const MASKED_PATH = '/api/cuentas/[CLABE]?curp=[CURP]';

const redact = createRedactor();

type Format = Parameters<typeof maskedMorganFormat>[2];

interface RequestSnapshot {
  readonly body: unknown;
  readonly query: unknown;
  readonly params: unknown;
  readonly headers: unknown;
}

function snapshotOf(request: Request): RequestSnapshot {
  return {
    body: structuredClone(request.body),
    query: structuredClone({ ...request.query }),
    params: structuredClone({ ...request.params }),
    headers: structuredClone(request.headers),
  };
}

morgan.token('titular', () => CURP);

describe.each(EXPRESS_VERSIONS)('maskedMorganFormat on %s', (_, express) => {
  interface LoggedRequest {
    readonly raw: string;
    readonly before: RequestSnapshot;
    readonly after: RequestSnapshot;
  }

  async function logRequest(
    format: Format,
    redactor: Redactor = redact,
  ): Promise<LoggedRequest> {
    const output = capturedOutput();
    const snapshots: { before?: RequestSnapshot; request?: Request } = {};
    const app: Express = express();
    app.use(express.json());
    app.use(
      morgan(maskedMorganFormat(redactor, morgan, format), {
        stream: output.destination,
      }),
    );
    app.post(ROUTE, (request, response) => {
      snapshots.before = snapshotOf(request);
      snapshots.request = request;
      response.setHeader('set-cookie', CREDENTIAL);
      response.sendStatus(200);
    });

    await sendTo(app, {
      method: 'POST',
      path: PATH,
      headers: {
        referer: `https://banco.example/rfc/${RFC}`,
        authorization: CREDENTIAL,
        'x-rfc': RFC,
      },
      body: { tarjeta: CARD },
    });

    const { before, request } = snapshots;
    if (before === undefined || request === undefined) {
      throw new Error('the route did not run');
    }
    return { raw: output.raw(), before, after: snapshotOf(request) };
  }

  it('masks a predefined format by name, URL and referer included', async () => {
    const { raw } = await logRequest('combined');

    expect(raw).toContain(`"POST ${MASKED_PATH} HTTP/1.1" 200`);
    expect(raw).toContain('"https://banco.example/rfc/[RFC]"');
  });

  it('masks a format string', async () => {
    const { raw } = await logRequest(':method :url :req[x-rfc]');

    expect(raw).toBe(`POST ${MASKED_PATH} [RFC]\n`);
  });

  it.each([':req[authorization]', ':req[Authorization]', ':res[set-cookie]'])(
    'replaces the credential header in %s',
    async (format) => {
      const { raw } = await logRequest(format);

      expect(raw).toBe('[REDACTED]\n');
    },
  );

  it('masks the tokens the application registered', async () => {
    const { raw } = await logRequest(':titular');

    expect(raw).toBe('[CURP]\n');
  });

  it('masks a format function of the application and its header tokens', async () => {
    const { raw } = await logRequest((tokens, request, response) => {
      const { url: urlToken, req: requestHeaderToken } = tokens;
      const url = urlToken?.(request, response) ?? '';
      const credential =
        requestHeaderToken?.(request, response, 'authorization') ?? '';
      return `${url} ${credential}`;
    });

    expect(raw).toBe(`${MASKED_PATH} [REDACTED]\n`);
  });

  it('writes nothing when the format skips the line', async () => {
    const { raw } = await logRequest(() => undefined);

    expect(raw).toBe('');
  });

  it('never writes a raw identifier or a credential', async () => {
    const { raw } = await logRequest(
      ':method :url :referrer :req[authorization] :req[x-rfc] :res[set-cookie] :titular',
    );

    for (const value of [...RAW_IDENTIFIERS, CREDENTIAL]) {
      expect(raw).not.toContain(value);
    }
  });

  it('leaves the body, query, params and headers of req untouched', async () => {
    const { before, after } = await logRequest('combined');

    expect(after).toEqual(before);
  });

  it('fails closed when the redactor throws', async () => {
    const { raw } = await logRequest('combined', failingRedactor());

    expect(raw).toBe('[REDACTED]\n');
  });
});

describe('maskedMorganFormat', () => {
  it('registers no morgan token or format', () => {
    const before = Reflect.ownKeys(morgan);

    maskedMorganFormat(redact, morgan, ':method :url');

    expect(Reflect.ownKeys(morgan)).toEqual(before);
  });
});
