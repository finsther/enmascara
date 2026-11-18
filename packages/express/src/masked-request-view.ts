import type { Redactor } from 'enmascara';
import {
  hasMaskableHeaders,
  withoutCredentialHeaders,
} from './credential-headers.js';
import { REDACTED_RECORD, type RedactedRecord } from './masking.js';
import { isRecord, type UnknownRecord } from './records.js';

/**
 * The parts of an Express request that {@link maskedRequestView} reads. An
 * Express 4 or 5 `Request` has all of them.
 */
export interface ViewableRequest {
  readonly method?: string | undefined;
  readonly url?: string | undefined;
  readonly originalUrl?: string | undefined;
  readonly params?: unknown;
  readonly query?: unknown;
  readonly headers?: unknown;
  readonly body?: unknown;
}

/** A masked copy of the parts of a request worth logging. */
export interface MaskedRequestFields {
  readonly method: unknown;
  readonly url: unknown;
  readonly params: unknown;
  readonly query: unknown;
  readonly headers: unknown;
  readonly body: unknown;
}

/** What {@link maskedRequestView} returns when masking fails. */
export type RedactedRequestView = RedactedRecord;

/** The result of {@link maskedRequestView}. */
export type MaskedRequestView = MaskedRequestFields | RedactedRequestView;

function requestFields(request: ViewableRequest): UnknownRecord {
  return {
    method: request.method,
    url: request.originalUrl ?? request.url,
    params: request.params,
    query: request.query,
    headers: request.headers,
    body: request.body,
  };
}

function viewOf(masked: unknown): MaskedRequestView {
  if (!isRecord(masked) || !hasMaskableHeaders(masked)) {
    return REDACTED_RECORD;
  }
  const { method, url, params, query, headers, body } = masked;
  return {
    method,
    url,
    params,
    query,
    headers: withoutCredentialHeaders(headers),
    body,
  };
}

/**
 * Returns a masked copy of the method, URL, route params, query, headers and
 * body of a request, for a logger to write. The URL is `originalUrl`, so it
 * keeps the path and query as the client sent them.
 *
 * The request is only read, never written. The values of the headers that
 * carry credentials or sessions (`authorization`, `proxy-authorization`,
 * `cookie` and `set-cookie`) are replaced by `[REDACTED]`, since enmascara
 * cannot recognize tokens. Call it when the line is written: Express fills
 * `req.params` only once a route matches.
 *
 * Masking fails closed: if the redactor throws or returns something other
 * than an object, the view is `{ enmascara: '[REDACTED]' }`.
 *
 * @param redactor - Redactor created with `createRedactor` from `enmascara`.
 * @param request - The Express 4 or 5 request.
 * @returns A new masked object; the request is left untouched.
 * @example
 * ```ts
 * import { createRedactor } from 'enmascara';
 * import { maskedRequestView } from 'enmascara-express';
 *
 * const view = maskedRequestView(createRedactor(), {
 *   method: 'GET',
 *   originalUrl: '/api/cuentas/002180032240946700',
 *   headers: { authorization: 'Bearer token' },
 * });
 * // { method: 'GET', url: '/api/cuentas/[CLABE]',
 * //   headers: { authorization: '[REDACTED]' }, ... }
 * ```
 */
export function maskedRequestView(
  redactor: Redactor,
  request: ViewableRequest,
): MaskedRequestView {
  try {
    return viewOf(redactor.object(requestFields(request)));
  } catch {
    return REDACTED_RECORD;
  }
}
