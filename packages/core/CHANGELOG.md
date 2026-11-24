# enmascara

## 0.1.1

### Patch Changes

- f5dd8ef: `redact.object()` keeps the stack of copied errors, masked. In Node 22 and 24 the stack is an accessor and was dropped; it is now read through the engine's own getter, and getters defined by the application still never run.
- 5055db0: `redact.object()` keeps the insertion order of keys. Copies used to list keys in reverse at every level, so every log line written through the integrations came out backwards; errors now list `name`, `message` and `stack` first, followed by their own keys.

## 0.1.0

### Minor Changes

- e497dd6: Add `createRedactor()`, which detects CLABE, CURP, RFC and card numbers validated by their check digits and masks them in text (`text()`), deep copies of objects (`object()`) and position reports without values (`findings()`). Masks use the redact strategy, such as `[CURP]`.
- f67e88d: Add the `partial` and `hmac` masking strategies. `createRedactor({ strategy, hmacKey })` takes one strategy for every type or one per type over a default. `partial` keeps only the last characters each type allows (2 for CURP and RFC, 4 for CLABE and cards), and `hmac` writes a stable tag such as `[CURP:3f9a1c]` from HMAC-SHA256 with a key of at least 32 bytes.

### Patch Changes

- 7051d3f: Normalize runs of ASCII text in one step instead of character by character, which makes `text()` several times faster on typical logs. The output is unchanged.
- 6aca7bf: Ship the README and the MIT license in the package, add the repository, homepage, bugs and keywords fields, and publish publicly with npm provenance.
