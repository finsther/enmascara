---
"enmascara": patch
---

Normalize runs of ASCII text in one step instead of character by character, which makes `text()` several times faster on typical logs. The output is unchanged.
