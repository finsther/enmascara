# enmascara-express

## 0.1.0

### Minor Changes

- 96c5081: Add `maskedPinoHttpOptions`, `maskedMorganFormat` and `maskedRequestView` for Express 4 and 5. They mask the URL with its path and query, the route params, the headers and the errors that pino-http 11 and morgan 1 write for each request, replace the values of the `authorization`, `proxy-authorization`, `cookie` and `set-cookie` headers with `[REDACTED]`, never log the request body, never write to `req` or `res`, and fail closed. The package loads nothing at runtime and ships its README and the MIT license.

### Patch Changes

- Updated dependencies [f5dd8ef]
- Updated dependencies [5055db0]
  - enmascara@0.1.1
