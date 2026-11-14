---
'enmascara-sentry': minor
---

Add `maskedSentryOptions(redactor, options)` for `@sentry/node` 10 and 11. Its `beforeSend` and `beforeBreadcrumb` mask a copy of every error event and breadcrumb after the hooks of the application run, keep the identifiers Sentry generates for the event and its trace, and drop what cannot be masked. Transactions, spans, logs and the trace header of each envelope are not masked yet.
