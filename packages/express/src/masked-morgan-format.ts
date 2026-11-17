import type { Redactor } from 'enmascara';
import type Morgan from 'morgan';
import { isCredentialHeader } from './credential-headers.js';
import { REDACTED } from './redacted.js';

type DefaultFormat = Morgan.FormatFn;
type DefaultRequest = Parameters<DefaultFormat>[1];
type DefaultResponse = Parameters<DefaultFormat>[2];
type FormatLine = string | undefined | null;
type HeaderToken<Request, Response> = (
  request: Request,
  response: Response,
  headerName?: string,
) => string | undefined;

const HEADER_TOKEN_NAMES = ['req', 'res'] as const;

function predefinedFormat(morgan: typeof Morgan, name: string): string {
  const predefined: unknown = Object.getOwnPropertyDescriptor(
    morgan,
    name,
  )?.value;
  return typeof predefined === 'string' ? predefined : name;
}

function formatFunction<
  Request extends DefaultRequest,
  Response extends DefaultResponse,
>(
  morgan: typeof Morgan,
  format: string | Morgan.FormatFn<Request, Response>,
): Morgan.FormatFn<Request, Response> {
  return typeof format === 'string'
    ? morgan.compile<Request, Response>(predefinedFormat(morgan, format))
    : format;
}

function withoutCredentials<Request, Response>(
  headerToken: HeaderToken<Request, Response> | undefined,
): HeaderToken<Request, Response> {
  return (request, response, headerName) =>
    headerName !== undefined && isCredentialHeader(headerName)
      ? REDACTED
      : headerToken?.(request, response, headerName);
}

function credentialSafeTokens<
  Request extends DefaultRequest,
  Response extends DefaultResponse,
>(
  tokens: Morgan.TokenIndexer<Request, Response>,
): Morgan.TokenIndexer<Request, Response> {
  return Object.create(
    tokens,
    Object.fromEntries(
      HEADER_TOKEN_NAMES.map((name) => [
        name,
        { value: withoutCredentials(tokens[name]) },
      ]),
    ),
  );
}

function maskLine(redactor: Redactor, line: FormatLine): FormatLine {
  if (line === undefined || line === null) {
    return line;
  }
  try {
    return redactor.text(line);
  } catch {
    return REDACTED;
  }
}

/**
 * Returns a morgan format function that masks every identifier the redactor
 * detects in the line before morgan writes it. The whole line is masked, so
 * the URL with its path and query, the referer and the tokens the
 * application registered are covered.
 *
 * The `:req[header]` and `:res[header]` tokens write `[REDACTED]` for the
 * headers that carry credentials or sessions (`authorization`,
 * `proxy-authorization`, `cookie` and `set-cookie`), since enmascara cannot
 * recognize tokens. No morgan token or format is registered or replaced, and
 * morgan is received as a parameter, so this package never loads it on its
 * own.
 *
 * Masking fails closed: if the redactor throws, the line is `[REDACTED]`.
 *
 * @param redactor - Redactor created with `createRedactor` from `enmascara`.
 * @param morgan - The `morgan` function of the application.
 * @param format - The name of a predefined morgan format such as
 * `'combined'`, a format string such as `':method :url :status'`, or a format
 * function.
 * @returns A format function, to pass to `morgan(...)`.
 * @throws {TypeError} When morgan cannot compile the format, as `morgan`
 * itself does; the error never includes request data.
 * @example
 * ```ts
 * import express from 'express';
 * import morgan from 'morgan';
 * import { createRedactor } from 'enmascara';
 * import { maskedMorganFormat } from 'enmascara-express';
 *
 * const app = express();
 * app.use(morgan(maskedMorganFormat(createRedactor(), morgan, 'combined')));
 * // GET /api/cuentas/002180032240946700 is written as
 * // "GET /api/cuentas/[CLABE] HTTP/1.1" 200 ...
 * ```
 */
export function maskedMorganFormat<
  Request extends DefaultRequest = DefaultRequest,
  Response extends DefaultResponse = DefaultResponse,
>(
  redactor: Redactor,
  morgan: typeof Morgan,
  format: string | Morgan.FormatFn<Request, Response>,
): Morgan.FormatFn<Request, Response> {
  const formatLine = formatFunction(morgan, format);
  return (tokens, request, response) =>
    maskLine(
      redactor,
      formatLine(credentialSafeTokens(tokens), request, response),
    );
}
