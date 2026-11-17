# enmascara-sentry

> Ningún dato pierde la máscara, tampoco en Sentry.

Enmascara CLABE, CURP, RFC y tarjetas en todo lo que tu aplicación envía a Sentry: errores, transacciones, spans, logs, métricas, breadcrumbs y el encabezado de cada envelope. Usa [`enmascara`](https://github.com/finsther/enmascara#readme), así que solo enmascara lo que pasa la validación del dígito verificador.

## Instalación

```bash
npm install enmascara enmascara-sentry @sentry/node
```

Funciona con `@sentry/node` 10 y 11, con spans en streaming o estáticos, en Node 22 o posterior.

## Uso

Envuelve las opciones de `Sentry.init` con `maskedSentryOptions`:

```ts
import * as Sentry from '@sentry/node';
import { createRedactor } from 'enmascara';
import { maskedSentryOptions } from 'enmascara-sentry';

Sentry.init(
  maskedSentryOptions(createRedactor(), {
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1,
  }),
);

Sentry.captureException(new Error('RFC GODE561231GR8 no coincide'));
```

Sentry recibe `RFC [RFC] no coincide`. El redactor acepta las mismas opciones de siempre, por ejemplo `createRedactor({ strategy: 'hmac', hmacKey })` para correlacionar errores sin ver el dato.

En [`examples/sentry`](https://github.com/finsther/enmascara/tree/main/examples/sentry) hay un ejemplo ejecutable que imprime el evento tal como lo enviaría Sentry.

## Qué enmascara

| Lo que sale | Hook | Si el enmascarado falla |
| --- | --- | --- |
| Errores y mensajes | `beforeSend` | Se descarta |
| Transacciones (Sentry 10 y spans estáticos en 11) | `beforeSendTransaction` | Se descarta |
| Spans | `beforeSendSpan` | Sale solo con sus tiempos y el nombre `[REDACTED]`, porque Sentry no deja descartar un span |
| Logs | `beforeSendLog` | Se descarta |
| Métricas | `beforeSendMetric` | Se descarta |
| Breadcrumbs | `beforeBreadcrumb` | Se descarta |
| Encabezado `trace` de cada envelope | Integración `EnmascaraTraceHeader` | Se quita la transacción del encabezado |

Dentro de cada uno revisa todo el contenido: mensajes, excepciones, variables de los stack frames, `request` (URL, query, cuerpo, headers y cookies), `extra`, `contexts`, `user`, `tags`, nombres y atributos de spans, y los atributos de logs y métricas.

## Lo que conviene saber

- **Tus hooks corren primero.** Si defines `beforeSend` u otro hook, Enmascara enmascara lo que devuelve. Si devuelve `null`, el dato se descarta como siempre.
- **No toca el original.** Cada evento se enmascara como copia, y las opciones que pasas no se modifican.
- **Conserva los IDs de Sentry.** `event_id`, `trace_id`, `span_id` y `parent_span_id`, en hexadecimal, se mantienen aunque sus dígitos parezcan una CLABE o una tarjeta, para que Sentry siga uniendo trazas.
- **Con spans en streaming** (lo predeterminado en `@sentry/node` 11), Sentry ignora `beforeSendTransaction`, así que Enmascara no lo define y deja el tuyo como está.
- **Los adjuntos no se revisan.** Lo que envíes con `addAttachment` sale tal cual.

## Licencia

MIT. Ver [LICENSE](LICENSE).
