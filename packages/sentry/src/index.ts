import type { NodeOptions } from '@sentry/node';
import * as sentry from '@sentry/node';
import type { Redactor } from 'enmascara';
import { maskOrDrop } from './masking.js';
import { maskSpan, reduceSpan } from './spans.js';
import { withTraceHeaderIntegration } from './trace-header.js';

type BeforeSend = NonNullable<NodeOptions['beforeSend']>;
type BeforeSendTransaction = NonNullable<NodeOptions['beforeSendTransaction']>;
type BeforeSendSpan = NonNullable<NodeOptions['beforeSendSpan']>;
type BeforeBreadcrumb = NonNullable<NodeOptions['beforeBreadcrumb']>;
type BeforeSendLog = NonNullable<NodeOptions['beforeSendLog']>;
type BeforeSendMetric = NonNullable<NodeOptions['beforeSendMetric']>;
type ItemHook<Item> = (item: Item) => Item | null;
type EventHint = Parameters<BeforeSend>[1];
type EventHook<Event> = (
  event: Event,
  hint: EventHint,
) => PromiseLike<Event | null> | Event | null;
type StaticSpanCallback = Parameters<typeof sentry.withStaticSpan>[0];

const STATIC_TRACE_LIFECYCLE = 'static';

const WITH_STATIC_SPAN_EXPORT = 'withStaticSpan';

const markStaticSpanCallback: typeof sentry.withStaticSpan | undefined =
  WITH_STATIC_SPAN_EXPORT in sentry ? sentry.withStaticSpan : undefined;

/**
 * Sentry options returned by {@link maskedSentryOptions}: the options
 * received, with their masking hooks always defined. `beforeSendTransaction`
 * is only replaced when Sentry uses it, which excludes streamed spans in
 * `@sentry/node` 11.
 */
export type MaskedSentryOptions = NodeOptions & {
  readonly integrations: NonNullable<NodeOptions['integrations']>;
  readonly beforeSend: BeforeSend;
  readonly beforeSendSpan: BeforeSendSpan;
  readonly beforeBreadcrumb: BeforeBreadcrumb;
  readonly beforeSendLog: BeforeSendLog;
  readonly beforeSendMetric: BeforeSendMetric;
};

function isPromiseLike<Event>(
  result: PromiseLike<Event | null> | Event | null,
): result is PromiseLike<Event | null> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'then' in result &&
    typeof result.then === 'function'
  );
}

function maskedEventHook<Event extends object>(
  redactor: Redactor,
  applicationHook: EventHook<Event> | undefined,
): EventHook<Event> {
  return (event, hint) => {
    const result =
      applicationHook === undefined ? event : applicationHook(event, hint);
    return isPromiseLike(result)
      ? Promise.resolve(result).then((resolved) =>
          maskOrDrop(redactor, resolved),
        )
      : maskOrDrop(redactor, result);
  };
}

function streamsSpans(options: NodeOptions): boolean {
  return (
    markStaticSpanCallback !== undefined &&
    options.traceLifecycle !== STATIC_TRACE_LIFECYCLE
  );
}

function maskedBeforeSendSpan(
  redactor: Redactor,
  options: NodeOptions,
): BeforeSendSpan {
  const applicationBeforeSendSpan = options.beforeSendSpan;
  const beforeSendSpan: BeforeSendSpan = (span) => {
    try {
      return maskSpan(
        redactor,
        applicationBeforeSendSpan === undefined
          ? span
          : applicationBeforeSendSpan(span),
      );
    } catch {
      return reduceSpan(span);
    }
  };
  return markStaticSpanCallback !== undefined && !streamsSpans(options)
    ? markStaticSpanCallback(beforeSendSpan as unknown as StaticSpanCallback)
    : beforeSendSpan;
}

function maskedBeforeSendTransaction(
  redactor: Redactor,
  options: NodeOptions,
): Pick<NodeOptions, 'beforeSendTransaction'> {
  return streamsSpans(options)
    ? {}
    : {
        beforeSendTransaction: maskedEventHook<
          Parameters<BeforeSendTransaction>[0]
        >(redactor, options.beforeSendTransaction),
      };
}

function maskedItemHook<Item extends object>(
  redactor: Redactor,
  applicationHook: ItemHook<Item> | undefined,
): ItemHook<Item> {
  return (item) =>
    maskOrDrop(
      redactor,
      applicationHook === undefined ? item : applicationHook(item),
    );
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
 * Returns a copy of the Sentry options whose hooks mask every identifier the
 * redactor detects before an error event, transaction, span, log, metric or
 * breadcrumb leaves the process: messages, exception values, stack frame
 * variables, `request` (URL, query, data, headers and cookies), `extra`,
 * `contexts`, `user`, `tags`, span names and attributes, log messages, the
 * attributes of logs and metrics, and breadcrumbs. An `EnmascaraTraceHeader`
 * integration, added after the integrations of the application, also masks
 * the transaction in the trace header of each envelope.
 *
 * Each payload is masked as a copy, so the original stays as it was. The
 * identifiers Sentry generates for events, traces and spans (`event_id`,
 * `trace_id`, `span_id` and `parent_span_id`, in hexadecimal) are kept even
 * when their digits look like a CLABE or a card.
 *
 * The hooks of the application still run first, and masking applies to what
 * they return; if they return `null`, the payload is dropped. The options
 * received are never modified. With streamed spans in `@sentry/node` 11,
 * `beforeSendTransaction` is left as received, because Sentry ignores it.
 *
 * Masking fails closed: if the redactor throws, error events, transactions,
 * logs, metrics and breadcrumbs are dropped, the transaction is removed from
 * the trace header, and a span, which Sentry does not let a hook drop, is sent
 * with its name replaced by `[REDACTED]` and only its timing.
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
    beforeSend: maskedEventHook(redactor, options.beforeSend),
    ...maskedBeforeSendTransaction(redactor, options),
    beforeSendSpan: maskedBeforeSendSpan(redactor, options),
    beforeBreadcrumb: maskedBeforeBreadcrumb(
      redactor,
      options.beforeBreadcrumb,
    ),
    beforeSendLog: maskedItemHook(redactor, options.beforeSendLog),
    beforeSendMetric: maskedItemHook(redactor, options.beforeSendMetric),
    integrations: withTraceHeaderIntegration(redactor, options.integrations),
  };
}
