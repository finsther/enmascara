import type { NodeOptions } from '@sentry/node';
import type { Redactor } from 'enmascara';
import { maskOrDrop } from './masking.js';

type BeforeSend = NonNullable<NodeOptions['beforeSend']>;
type BeforeBreadcrumb = NonNullable<NodeOptions['beforeBreadcrumb']>;
type BeforeSendResult = ReturnType<BeforeSend>;

/**
 * Sentry options returned by {@link maskedSentryOptions}: the options
 * received, with `beforeSend` and `beforeBreadcrumb` always defined.
 */
export type MaskedSentryOptions = NodeOptions & {
  readonly beforeSend: BeforeSend;
  readonly beforeBreadcrumb: BeforeBreadcrumb;
};

function isPromiseLike(
  result: BeforeSendResult,
): result is Extract<BeforeSendResult, PromiseLike<unknown>> {
  return result !== null && 'then' in result;
}

function maskedBeforeSend(
  redactor: Redactor,
  applicationBeforeSend: BeforeSend | undefined,
): BeforeSend {
  return (event, hint) => {
    const result =
      applicationBeforeSend === undefined
        ? event
        : applicationBeforeSend(event, hint);
    return isPromiseLike(result)
      ? Promise.resolve(result).then((resolved) =>
          maskOrDrop(redactor, resolved),
        )
      : maskOrDrop(redactor, result);
  };
}

function maskedBeforeBreadcrumb(
  redactor: Redactor,
  applicationBeforeBreadcrumb: BeforeBreadcrumb | undefined,
): BeforeBreadcrumb {
  return (breadcrumb, hint) =>
    maskOrDrop(
      redactor,
      applicationBeforeBreadcrumb === undefined
        ? breadcrumb
        : applicationBeforeBreadcrumb(breadcrumb, hint),
    );
}

/**
 * Returns a copy of the Sentry options whose `beforeSend` and
 * `beforeBreadcrumb` mask every identifier the redactor detects before an
 * error event or breadcrumb leaves the process: messages, exception values,
 * stack frame variables, `request` (URL, query, data, headers and cookies),
 * `extra`, `contexts`, `user`, `tags` and breadcrumbs.
 *
 * Each event is masked as a copy, so the original stays as it was. The
 * identifiers Sentry generates for the event and its trace (`event_id`,
 * `trace_id`, `span_id` and `parent_span_id`, in hexadecimal) are kept even
 * when their digits look like a CLABE or a card.
 *
 * The `beforeSend` and `beforeBreadcrumb` of the application still run first,
 * and masking applies to what they return; if they return `null`, the event
 * or breadcrumb is dropped. The options received are never modified.
 *
 * Masking fails closed: if the redactor throws, the event or breadcrumb is
 * dropped instead of being sent.
 *
 * Only error events and breadcrumbs are masked. Transactions, spans, logs,
 * metrics, attachments and the trace header of each envelope, which carries
 * the name of the root span, are sent as Sentry builds them.
 *
 * @param redactor - Redactor created with `createRedactor` from `enmascara`.
 * @param options - Options for `Sentry.init` from `@sentry/node`, version 10
 * or 11.
 * @returns The options, ready for `Sentry.init`.
 * @example
 * ```ts
 * import * as Sentry from '@sentry/node';
 * import { createRedactor } from 'enmascara';
 * import { maskedSentryOptions } from 'enmascara-sentry';
 *
 * Sentry.init(
 *   maskedSentryOptions(createRedactor(), { dsn: process.env.SENTRY_DSN }),
 * );
 *
 * Sentry.captureException(new Error('RFC GODE561231GR8 no coincide'));
 * // Sentry receives "RFC [RFC] no coincide"
 * ```
 */
export function maskedSentryOptions(
  redactor: Redactor,
  options: NodeOptions,
): MaskedSentryOptions {
  return {
    ...options,
    beforeSend: maskedBeforeSend(redactor, options.beforeSend),
    beforeBreadcrumb: maskedBeforeBreadcrumb(
      redactor,
      options.beforeBreadcrumb,
    ),
  };
}
