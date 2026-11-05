---
"enmascara": minor
---

Add the `partial` and `hmac` masking strategies. `createRedactor({ strategy, hmacKey })` takes one strategy for every type or one per type over a default. `partial` keeps only the last characters each type allows (2 for CURP and RFC, 4 for CLABE and cards), and `hmac` writes a stable tag such as `[CURP:3f9a1c]` from HMAC-SHA256 with a key of at least 32 bytes.
