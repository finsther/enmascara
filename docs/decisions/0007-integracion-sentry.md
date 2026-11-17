# ADR 0007: Integración con Sentry

- **Estado:** aceptado
- **Fecha:** 2026-11-17
- **Historia:** Sprint 2, historia 2 (`enmascara-sentry`)

## Contexto

`enmascara-sentry` empezó enmascarando solo errores y breadcrumbs (`beforeSend` y `beforeBreadcrumb`). La revisión de #21 mostró que, con trazas activas, una CLABE en el nombre de un span llegaba a Sentry en dos lugares: en el span y en el encabezado `trace` del envelope.

`@sentry/node` 10 y 11 tienen un hook para cada tipo de dato que sale, pero con contratos distintos:

- **Sentry 11 envía los spans en streaming de forma predeterminada** (`traceLifecycle: 'stream'`). En ese modo ignora `beforeSendTransaction` y avisa en cada inicio si está definido.
- **El modo `static` de Sentry 11 exige `withStaticSpan`.** Solo llama a `beforeSendSpan` si la función está marcada con ese wrapper. Sentry 10 no lo tiene.
- **`beforeSendSpan` no puede descartar un span.** Si el hook lanza un error o devuelve un valor vacío, Sentry envía el span original.
- **En el modo stream, el encabezado del envelope se arma antes de los hooks**, con el nombre del span raíz. Sentry avisa cuando lo crea con el evento `createDsc` del cliente.

## Decisiones

- **Opciones envueltas, no un cliente propio.** `maskedSentryOptions(redactor, options)` devuelve las opciones de `Sentry.init` con todos sus hooks definidos: `beforeSend`, `beforeSendTransaction`, `beforeSendSpan`, `beforeSendLog`, `beforeSendMetric` y `beforeBreadcrumb`. Los hooks de la aplicación corren primero, y Enmascara trabaja sobre lo que devuelven.
- **Copias que conservan los IDs del SDK.** Cada dato se enmascara como copia con `redact.object()`. `event_id`, `trace_id`, `span_id` y `parent_span_id` se restauran desde el original cuando son hexadecimales de 16 o 32 caracteres. Eso aplica al evento, a `contexts.trace`, a cada span y a cada elemento de `spans` de una transacción. Sin esa restauración, un ID cuyos dígitos parecen una tarjeta se enmascararía y Sentry dejaría de unir la traza.
- **Falla cerrada, según lo que Sentry permite:**

  | Dato | Si el enmascarado falla |
  | --- | --- |
  | Errores, transacciones, logs, métricas y breadcrumbs | Se descartan con `null`. Es el protocolo de Sentry para descartar, y por eso el adaptador usa `null` aunque el resto del proyecto no lo hace |
  | Spans | Salen reducidos: se conservan los IDs del SDK, los números, los booleanos y los textos sin dígitos, y el nombre pasa a `[REDACTED]`. Un identificador siempre lleva dígitos, así que un texto sin dígitos no puede contener uno |
  | Encabezado del envelope | Se quita la transacción |

  Si el `beforeSendSpan` de la aplicación lanza un error, el span también sale reducido.
- **Detección del modo de spans.** Si `@sentry/node` exporta `withStaticSpan` y `traceLifecycle` no es `'static'`, los spans van en streaming. En ese caso `beforeSendTransaction` se deja como lo pasó la aplicación, para evitar el aviso. En el modo `static`, `beforeSendSpan` se marca con `withStaticSpan`. La exportación se busca con `in`, porque Sentry 10 no la tiene.
- **Encabezado del envelope con una integración.** `EnmascaraTraceHeader` se agrega después de las `integrations` de la aplicación, sea arreglo o función, y en `createDsc` enmascara `transaction`, el único campo de texto libre del encabezado. `trace_id`, `public_key` y los campos de muestreo los genera Sentry.
- **Fuera de alcance.** Los adjuntos (`addAttachment`) salen tal cual; el README lo advierte.

## Cómo se verifica

- **Tests contra los clientes reales.** Usan un transporte que guarda cada envelope: en Sentry 11 con spans en streaming y estáticos, y en Sentry 10. Verifican que ningún identificador llegue ni al cuerpo ni al encabezado, y que Sentry arranque sin avisos.
- **Sentry 10 con su propio SDK.** Las dos versiones están instaladas para los tests, así que el archivo de Sentry 10 hace `vi.mock('@sentry/node')` con `sentry-node-10`. Así el paquete también ve la versión 10, como en una instalación real, y cada archivo comprueba la versión del SDK con el que corre.
- **Tests unitarios de cada hook:** copias, IDs, hooks de la aplicación, descarte y reducción.

## Consecuencias

- Con trazas, cada span y cada transacción pasan por `redact.object()`, y eso se suma al costo de enmascarar. Medirlo queda pendiente.
- Si Sentry agrega un nuevo tipo de dato con su propio hook, este paquete no lo cubrirá hasta que se agregue.
- `release.yml` todavía publica solo `enmascara`. Publicar `enmascara-pino` y `enmascara-sentry` con provenance queda para un PR aparte, junto con la reserva de sus nombres en npm y su trusted publishing.
