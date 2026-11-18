---
'enmascara': patch
---

`redact.object()` keeps the insertion order of keys. Copies listed keys in reverse at every level, so every log line written through the integrations came out backwards; errors now list `name`, `message` and `stack` first, followed by their own keys.
