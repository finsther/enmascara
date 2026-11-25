---
"enmascara-pino": patch
---

Run the logger's serializers, including those a child adds, before masking. A serializer now receives the original value (for example an `IncomingMessage`) instead of a masked copy, and its output is masked afterwards. The redactor never copies values that have a serializer.
