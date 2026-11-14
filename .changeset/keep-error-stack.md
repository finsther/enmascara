---
'enmascara': patch
---

`redact.object()` keeps the stack of copied errors, masked. In Node 22 and 24 the stack is an accessor and was dropped; it is now read through the engine's own getter, and getters defined by the application still never run.
