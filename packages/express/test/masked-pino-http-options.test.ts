import { createRedactor, type Redactor } from 'enmascara';
import type { Express, NextFunction, Request, Response } from 'express';
import { type Options, pinoHttp } from 'pino-http';
import { describe, expect, it } from 'vitest';
import { maskedPinoHttpOptions } from '../src/index.js';
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
  redactorReturning,
} from './support/identifiers.js';

const REDACTED_RECORD = { enmascara: '[REDACTED]' };
const FAILURE_STATUS = 500;
const ROUTE = '/api/cuentas/:clabe';

const redact = createRedactor();

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

function failingRoute(request: Request, response: Response): void {
  const { clabe } = request.params;
  Object.assign(response, {
    err: new Error(`RFC ${RFC} no coincide con ${String(clabe)}`),
  });
  response.sendStatus(FAILURE_STATUS);
}

function forwardingRoute(
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  next(new Error(`RFC ${RFC} no coincide`));
}

function answeringErrorHandler(
  _error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  response.sendStatus(FAILURE_STATUS);
}

describe.each(EXPRESS_VERSIONS)('maskedPinoHttpOptions on %s', (_, express) => {
  interface LoggedRequest {
    readonly output: ReturnType<typeof capturedOutput>;
    readonly before: RequestSnapshot;
    readonly after: RequestSnapshot;
  }

  async function logRequest(
    options: Options = {},
    redactor: Redactor = redact,
    configureRoutes: (app: Express) => void = (app) => {
      app.post(ROUTE, (_request, response) => {
        response.setHeader('set-cookie', CREDENTIAL);
        response.sendStatus(200);
      });
    },
  ): Promise<LoggedRequest> {
    const output = capturedOutput();
    const snapshots: { before?: RequestSnapshot; request?: Request } = {};
    const app = express();
    app.use(express.json());
    app.use((request, _response, next) => {
      snapshots.request = request;
      next();
    });
    app.use(
      pinoHttp(maskedPinoHttpOptions(redactor, options), output.destination),
    );
    app.all(ROUTE, (request, _response, next) => {
      snapshots.before = snapshotOf(request);
      next();
    });
    configureRoutes(app);
    app.use(answeringErrorHandler);

    await sendTo(app, {
      method: 'POST',
      path: `/api/cuentas/${CLABE}?curp=${CURP}`,
      headers: {
        'x-rfc': RFC,
        authorization: CREDENTIAL,
        cookie: `sesion=${CREDENTIAL}`,
      },
      body: { tarjeta: CARD },
    });

    const { before, request } = snapshots;
    if (before === undefined || request === undefined) {
      throw new Error('the request was not logged');
    }
    return { output, before, after: snapshotOf(request) };
  }

  function onlyLine(output: ReturnType<typeof capturedOutput>) {
    const [line, ...others] = output.lines();
    expect(others).toEqual([]);
    return line;
  }

  it('masks the request and response pino-http writes', async () => {
    const { output } = await logRequest();

    expect(onlyLine(output)).toMatchObject({
      req: {
        method: 'POST',
        url: '/api/cuentas/[CLABE]?curp=[CURP]',
        query: { curp: '[CURP]' },
        headers: {
          'x-rfc': '[RFC]',
          authorization: '[REDACTED]',
          cookie: '[REDACTED]',
        },
      },
      res: { statusCode: 200, headers: { 'set-cookie': '[REDACTED]' } },
    });
  });

  it('adds the route params, masked, once the response finishes', async () => {
    const { output } = await logRequest();

    expect(onlyLine(output)).toMatchObject({ params: { clabe: '[CLABE]' } });
  });

  it('masks the error of a failed request and adds its route params', async () => {
    const { output } = await logRequest({}, redact, (app) => {
      app.post(ROUTE, failingRoute);
    });

    expect(onlyLine(output)).toMatchObject({
      err: { message: 'RFC [RFC] no coincide con [CLABE]' },
      params: { clabe: '[CLABE]' },
      res: { statusCode: FAILURE_STATUS },
    });
  });

  it('writes the params an error handler of the application sees, which Express already emptied', async () => {
    const { output } = await logRequest({}, redact, (app) => {
      app.post(ROUTE, forwardingRoute);
    });

    expect(onlyLine(output)).toMatchObject({
      params: {},
      res: { statusCode: FAILURE_STATUS },
    });
  });

  it('never writes a raw identifier, a credential or the body', async () => {
    const { output } = await logRequest({}, redact, (app) => {
      app.post(ROUTE, failingRoute);
    });

    for (const value of [...RAW_IDENTIFIERS, CREDENTIAL, 'tarjeta']) {
      expect(output.raw()).not.toContain(value);
    }
  });

  it('masks what the serializers of the application return', async () => {
    const { output } = await logRequest({
      serializers: {
        req: (request: Readonly<Record<string, unknown>>) => ({
          ...request,
          titular: CURP,
        }),
      },
    });

    expect(onlyLine(output)).toMatchObject({
      req: { titular: '[CURP]', headers: { authorization: '[REDACTED]' } },
    });
  });

  it('keeps what the custom objects of the application return', async () => {
    const { output } = await logRequest({
      customSuccessObject: (_request, _response, value: object) => ({
        ...value,
        origen: 'aplicacion',
      }),
    });

    expect(onlyLine(output)).toMatchObject({
      origen: 'aplicacion',
      params: { clabe: '[CLABE]' },
    });
  });

  it('follows the attribute keys the application renamed', async () => {
    const { output } = await logRequest({
      customAttributeKeys: { req: 'peticion', res: 'respuesta' },
    });

    expect(onlyLine(output)).toMatchObject({
      peticion: { headers: { authorization: '[REDACTED]' } },
      respuesta: { headers: { 'set-cookie': '[REDACTED]' } },
    });
  });

  it('applies a serializer the application kept under the default key after renaming it', async () => {
    const { output } = await logRequest({
      customAttributeKeys: { req: 'peticion' },
      serializers: {
        req: (request: Readonly<Record<string, unknown>>) => ({
          ...request,
          titular: CURP,
        }),
      },
    });

    expect(onlyLine(output)).toMatchObject({
      peticion: { titular: '[CURP]' },
    });
  });

  it('adds no params to a custom object that is not an object', async () => {
    const { output } = await logRequest({
      customSuccessObject: () => 'listo',
    });

    expect(onlyLine(output)).not.toHaveProperty('params');
  });

  it('leaves the body, query, params and headers of req untouched', async () => {
    const { before, after } = await logRequest();

    expect(after).toEqual(before);
  });

  it('fails closed when the redactor throws', async () => {
    const { output } = await logRequest({}, failingRedactor(), (app) => {
      app.post(ROUTE, failingRoute);
    });

    expect(onlyLine(output)).toMatchObject({
      req: REDACTED_RECORD,
      res: REDACTED_RECORD,
      err: REDACTED_RECORD,
      params: REDACTED_RECORD,
    });
    for (const value of [...RAW_IDENTIFIERS, CREDENTIAL]) {
      expect(output.raw()).not.toContain(value);
    }
  });
});

describe('maskedPinoHttpOptions', () => {
  it('fails closed when the redactor returns something other than an object', async () => {
    const options = maskedPinoHttpOptions<object, object>(
      redactorReturning(CURP),
    );

    const { req: requestSerializer } = options.serializers ?? {};

    expect(requestSerializer?.({ url: CURP })).toEqual(REDACTED_RECORD);
    expect(
      options.customSuccessObject?.({ params: { clabe: CLABE } }, {}, {}),
    ).toEqual({ params: REDACTED_RECORD });
  });

  it('fails closed when the redactor returns null', () => {
    const options = maskedPinoHttpOptions<object, object>(
      redactorReturning(null),
    );
    const { req: requestSerializer } = options.serializers ?? {};

    expect(requestSerializer?.({ url: CURP })).toEqual(REDACTED_RECORD);
  });

  it('adds no headers to a serialized record that has none', () => {
    const options = maskedPinoHttpOptions<object, object>(redact);
    const { err: errorSerializer } = options.serializers ?? {};

    expect(Object.keys(errorSerializer?.({ message: CURP }) as object)).toEqual(
      ['message'],
    );
  });

  it('fails closed when the serialized headers are not an object', () => {
    const options = maskedPinoHttpOptions<object, object>(redact, {
      serializers: { req: () => ({ headers: CREDENTIAL }) },
    });
    const { req: requestSerializer } = options.serializers ?? {};

    expect(requestSerializer?.({})).toEqual(REDACTED_RECORD);
  });

  it('adds no params when the request has none', () => {
    const options = maskedPinoHttpOptions<object, object>(redact);

    expect(
      Object.keys(options.customSuccessObject?.({}, {}, {}) as object),
    ).toEqual([]);
  });

  it('leaves the options it receives untouched', () => {
    const serializers = Object.freeze({ req: (value: unknown) => value });
    const options = Object.freeze({ level: 'warn', serializers });

    const masked = maskedPinoHttpOptions(redact, options);

    expect(masked).not.toBe(options);
    expect(masked).toMatchObject({ level: 'warn' });
    expect(options.serializers).toBe(serializers);
  });
});
