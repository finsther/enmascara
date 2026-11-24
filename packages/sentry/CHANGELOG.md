# enmascara-sentry

## 0.1.0

### Minor Changes

- 195838c: Add `maskedSentryOptions(redactor, options)` for `@sentry/node` 10 and 11, with streamed or static spans. Its `beforeSend`, `beforeSendTransaction`, `beforeSendSpan`, `beforeSendLog`, `beforeSendMetric` and `beforeBreadcrumb` mask a copy of every error event, transaction, span, log, metric and breadcrumb after the hooks of the application run, and an `EnmascaraTraceHeader` integration masks the transaction in the trace header of each envelope. The identifiers Sentry generates are kept. What cannot be masked is dropped, except spans, which Sentry does not let a hook drop and are sent with only their timing and the name `[REDACTED]`. The package ships its README and the MIT license.

### Patch Changes

- Updated dependencies [f5dd8ef]
- Updated dependencies [5055db0]
  - enmascara@0.1.1
