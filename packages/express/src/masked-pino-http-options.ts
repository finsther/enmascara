import type { Redactor } from 'enmascara';
import type { CustomAttributeKeys, Options } from 'pino-http';
import { maskHttpRecord, maskRecord } from './masking.js';
import { isRecord } from './records.js';

type DefaultObjectCallback = NonNullable<Options['customSuccessObject']>;
type DefaultRequest = Parameters<DefaultObjectCallback>[0];
type DefaultResponse = Parameters<DefaultObjectCallback>[1];
type Serializer = (value: unknown) => unknown;
type Serializers = Readonly<Record<string, Serializer>>;

type MaskedAttribute = 'req' | 'res' | 'err';

const MASKED_ATTRIBUTES: readonly MaskedAttribute[] = ['req', 'res', 'err'];
const PARAMS_KEY = 'params';

function maskingSerializer(
  redactor: Redactor,
  applicationSerializer: Serializer | undefined,
): Serializer {
  return (value) =>
    maskHttpRecord(
      redactor,
      applicationSerializer === undefined
        ? value
        : applicationSerializer(value),
    );
}

function maskedSerializers(
  redactor: Redactor,
  serializers: Serializers,
  attributeKeys: CustomAttributeKeys,
): Serializers {
  const masked = MASKED_ATTRIBUTES.map((attribute) => {
    const key = attributeKeys[attribute] ?? attribute;
    const applicationSerializer = serializers[key] ?? serializers[attribute];
    return [key, maskingSerializer(redactor, applicationSerializer)] as const;
  });
  return { ...serializers, ...Object.fromEntries(masked) };
}

function ownParams(request: object): unknown {
  return Object.getOwnPropertyDescriptor(request, PARAMS_KEY)?.value;
}

function withMaskedParams(
  redactor: Redactor,
  request: object,
  logObject: unknown,
): unknown {
  const params = ownParams(request);
  return isRecord(logObject) && params !== undefined
    ? { ...logObject, [PARAMS_KEY]: maskRecord(redactor, params) }
    : logObject;
}

/**
 * Returns pino-http options that mask what pino-http writes for an Express
 * request: the request, the response and the error, as the serializers of
 * pino-http and of the application produce them, and the route params, which
 * are added as `params` once the response finishes, when Express has filled
 * them.
 *
 * The values of the headers that carry credentials or sessions
 * (`authorization`, `proxy-authorization`, `cookie` and `set-cookie`) are
 * replaced by `[REDACTED]`. The request body is never added to the line:
 * enmascara detects CLABE, CURP, RFC and cards, and a body may carry names,
 * emails or addresses. The serializers and custom objects of the application
 * run first, the attribute keys it renamed are followed, and the options
 * received are never modified. Neither `req` nor `res` is written to by this
 * package.
 *
 * Masking fails closed: if the redactor throws or returns something other
 * than an object, the request, response, error or params are written as
 * `{ enmascara: '[REDACTED]' }`.
 *
 * @param redactor - Redactor created with `createRedactor` from `enmascara`.
 * @param options - pino-http options of the application. Defaults to none.
 * @returns New pino-http options, to pass to `pinoHttp`.
 * @example
 * ```ts
 * import express from 'express';
 * import { createRedactor } from 'enmascara';
 * import { maskedPinoHttpOptions } from 'enmascara-express';
 * import { pinoHttp } from 'pino-http';
 *
 * const app = express();
 * app.use(pinoHttp(maskedPinoHttpOptions(createRedactor(), { level: 'info' })));
 * // GET /api/cuentas/002180032240946700 is logged with
 * // "url":"/api/cuentas/[CLABE]" and "params":{"clabe":"[CLABE]"}
 * ```
 */
export function maskedPinoHttpOptions<
  Request extends object = DefaultRequest,
  Response = DefaultResponse,
  CustomLevels extends string = never,
>(
  redactor: Redactor,
  options: Options<Request, Response, CustomLevels> = {},
): Options<Request, Response, CustomLevels> {
  const { customSuccessObject, customErrorObject } = options;
  return {
    ...options,
    serializers: maskedSerializers(
      redactor,
      options.serializers ?? {},
      options.customAttributeKeys ?? {},
    ),
    customSuccessObject: (request, response, value: unknown) =>
      withMaskedParams(
        redactor,
        request,
        customSuccessObject?.(request, response, value) ?? value,
      ),
    customErrorObject: (request, response, error, value: unknown) =>
      withMaskedParams(
        redactor,
        request,
        customErrorObject?.(request, response, error, value) ?? value,
      ),
  };
}
