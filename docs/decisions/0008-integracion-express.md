# ADR 0008: Integración con Express

- **Estado:** aceptado
- **Fecha:** 2026-11-17
- **Historia:** Sprint 2, historia 3

## Contexto

La historia 3 pide fijar, antes del código, cómo `enmascara-express` entrega a pino-http o morgan una vista enmascarada de `req.body`, `req.query`, `req.params` y los headers sin tocar `req`. El modelo de amenazas exige que las integraciones trabajen sobre copias y que `req` no cambie.

Antes de decidir se midió el comportamiento de Express 4.22.3 y 5.3.0, pino-http 11.0.0 y morgan 1.12.1 con una petición local `POST /api/cuentas/:clabe?curp=…` que lleva un header `x-rfc` y un cuerpo JSON con una tarjeta:

| Hecho | Express 4 | Express 5 |
| --- | --- | --- |
| `req.params` en un middleware de aplicación, al entrar | `{}` | `{}` |
| `req.params` cuando la respuesta termina (`finish`) | `{ clabe }` | `{ clabe }` |
| `req.query` | Propiedad de datos | Getter del prototipo de Express |
| `req.headers` | Getter de `IncomingMessage` | Getter de `IncomingMessage` |
| `req.body` | Lo deja el parser (`express.json()`) | Igual |

pino-http serializa `req` cuando crea el logger hijo de la petición, al entrar: `params` sale vacío siempre. No registra el cuerpo. Con un pino normal escribe la URL, la query y los headers sin enmascarar.

Con el logger de `createMaskedLogger` (historia 1) como logger de pino-http, la línea sale enmascarada, pero sin `headers`, `query`, `remoteAddress` ni `res.statusCode`. El enmascarado de la historia 1 copia el `IncomingMessage` crudo antes de que corran los serializers de pino. Esa copia omite los getters, y `headers` es un getter. No hay fuga, pero la línea pierde datos útiles.

morgan escribe una línea de texto a partir de tokens. Los formatos predefinidos (`combined`, `common`, `short`, `tiny`, `dev`) incluyen `:url`, que lleva la ruta y la query. Ninguno incluye el cuerpo o los headers, salvo el referer y el user agent; los tokens propios de la aplicación pueden incluir cualquier cosa.

## Decisiones

1. **Sin middleware propio.** El paquete no exporta un `app.use(...)` que prepare la vista al entrar:
   - Al entrar, `req.params` está vacío y el cuerpo puede no existir todavía.
   - Guardar la vista para el logger obligaría a escribir en `req` o en `res.locals`.
   - pino-http y morgan ya reciben `req` en el momento de escribir.

   La vista se calcula cuando el logger la pide, nunca antes.
2. **`maskedRequestView(redactor, request)`** devuelve un objeto nuevo:
   - Campos: `{ method, url, params, query, headers, body }`. `url` es `originalUrl`, o `url` si no existe.
   - Todo pasa por `redact.object()`.
   - Lee `req` sin escribir en él. Usa los getters de Node (`headers`) y de Express (`query`), que son código de la plataforma y no de los datos.
   - Falla cerrada: si enmascarar falla, devuelve `{ enmascara: '[REDACTED]' }`.
3. **pino-http: `maskedPinoHttpOptions(redactor, options)`.** Devuelve las opciones de pino-http:
   - Sus serializers `req`, `res` y `err` enmascaran la salida de los serializers de pino-http y de la aplicación.
   - `customSuccessObject` y `customErrorObject` agregan `params`, enmascarados y leídos al terminar la respuesta, si la petición tiene `params` propios.
   - Las funciones de la aplicación corren antes que las del paquete.
   - **El cuerpo no se agrega a la línea.** `enmascara` solo detecta CLABE, CURP, RFC y tarjetas, y un cuerpo puede llevar nombres, correos o domicilios. Registrarlo es una decisión de la aplicación, que puede usar `maskedRequestView(...).body`.
4. **morgan: `maskedMorganFormat(redactor, morgan, format)`.**
   - Devuelve una función de formato para `morgan(...)`.
   - Acepta el nombre de un formato predefinido, una cadena de formato o una función. Compila los dos primeros con `morgan.compile` y enmascara la línea completa con `redact.text()`. Así cubre `:url`, el referer y cualquier token propio.
   - Los tokens `:req[header]` y `:res[header]` devuelven `[REDACTED]` para los headers de credenciales de la decisión 7.
   - Falla cerrada: si enmascarar falla, la línea es `[REDACTED]`.
   - morgan se recibe como parámetro, como pino en la historia 1, para que el paquete no lo cargue por su cuenta.
5. **Dependencias.**
   - `express` es la única `peerDependency` obligatoria (`^4.17.0 || ^5.0.0`). El paquete no importa ni sus tipos: `maskedRequestView` acepta cualquier objeto con la forma de una petición, y así sirve igual con los tipos de Express 4 y 5.
   - `pino-http` (`^11.0.0`) y `morgan` (`^1.10.0`) son `peerDependencies` opcionales: el paquete importa sus tipos, nunca su código.
   - El build no importa ningún módulo en runtime; un test lo revisa sobre `dist`.
6. **Arreglo en `enmascara-pino`.** `createMaskedLogger` debe aplicar los serializers del logger, incluidos los que agrega un hijo, antes de enmascarar los bindings y el objeto del log. Así no copia `IncomingMessage` ni `ServerResponse`. Va como `fix:` de `enmascara-pino`, con su test, en un PR aparte y antes del ejemplo de pino-http.

## Consecuencias

- La documentación de Express muestra dos configuraciones, pino-http y morgan, en lugar de un `app.use(enmascara())`.
- Con pino-http, `req.params` sale vacío en la línea de entrada y aparece como `params` en la línea de respuesta.
- Si un error pasa con `next(error)` a un manejador de errores de la aplicación, Express ya restauró `req.params` a `{}` antes de que termine la respuesta, y la línea sale con `"params":{}`. Recuperarlos exigiría guardarlos en `req` antes, lo que la decisión 1 descarta. El README lo documenta y un test lo fija.
- Un formato de morgan que no compila lanza al crear el middleware, como lo hace morgan; ese error nunca incluye datos de la petición.
- El paquete no registra tokens globales de morgan ni reemplaza los existentes.
- `enmascara-express` pasa `describeIntegrationPackage`, como pino y sentry: README en español, LICENSE, `publishConfig` y solo peers. El README de la raíz agrega Express a la tabla de integraciones.
- Los tests de extremo a extremo corren con Express 4 y 5. `examples/express` usa pino-http y morgan contra un servidor local en un puerto efímero, sin salir del proceso.

## Seguridad

| Amenaza | Control | Test |
| --- | --- | --- |
| Mutación de lo que usa el negocio | La vista es una copia; el paquete nunca escribe en `req` ni en `res` | Comparar `req.body`, `req.query`, `req.params` y `req.headers` antes y después de cada adaptador |
| Falla abierta | Cada adaptador devuelve `[REDACTED]` o `{ enmascara: '[REDACTED]' }` si el redactor lanza | Test con un redactor que lanza |
| Datos que el detector no conoce | El cuerpo no se registra por omisión | Test de que la línea de pino-http no contiene el cuerpo |
| Credenciales en los headers | Los headers de `spec/credential-headers.yaml` salen como `[REDACTED]` | Test con cada header de la lista, en mayúsculas y minúsculas, en la vista, en pino-http y en `:req[...]` de morgan |
| Identificadores en la URL | `url` y `:url` se enmascaran completas, con ruta y query | Test con CLABE en la ruta y CURP en la query |
