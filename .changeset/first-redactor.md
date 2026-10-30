---
"enmascara": minor
---

Add `createRedactor()`, which detects CLABE, CURP, RFC and card numbers validated by their check digits and masks them in text (`text()`), deep copies of objects (`object()`) and position reports without values (`findings()`). Masks use the redact strategy, such as `[CURP]`.
