# enmascara-express

> Ningún dato pierde la máscara, tampoco en los logs de tus peticiones.

Enmascara CLABE, CURP, RFC y tarjetas en lo que [pino-http](https://github.com/pinojs/pino-http) y [morgan](https://github.com/expressjs/morgan) escriben de cada petición de Express: la URL con su ruta y su query, los params de la ruta, los headers y los errores. Usa [`enmascara`](https://github.com/finsther/enmascara#readme), así que solo enmascara lo que pasa la validación del dígito verificador.

## Instalación

```bash
npm install enmascara enmascara-express
```

Funciona con Express 4 y 5, pino-http 11 y morgan 1, en Node 22 o posterior. Instala además el logger que uses: `pino-http` o `morgan`.

## Uso con pino-http

Envuelve las opciones de `pinoHttp` con `maskedPinoHttpOptions`:

```ts
import express from 'express';
import { createRedactor } from 'enmascara';
import { maskedPinoHttpOptions } from 'enmascara-express';
import { pinoHttp } from 'pino-http';

const app = express();
app.use(pinoHttp(maskedPinoHttpOptions(createRedactor(), { level: 'info' })));
```

Una petición a `/api/cuentas/002180032240946700?curp=GODE561231HDFRRN00` se registra con `"url":"/api/cuentas/[CLABE]?curp=[CURP]"`, `"query":{"curp":"[CURP]"}` y, en la línea de respuesta, `"params":{"clabe":"[CLABE]"}`.

## Uso con morgan

Pasa a `morgan` el formato que devuelve `maskedMorganFormat`. Acepta el nombre de un formato predefinido, una cadena de formato o una función:

```ts
import express from 'express';
import morgan from 'morgan';
import { createRedactor } from 'enmascara';
import { maskedMorganFormat } from 'enmascara-express';

const app = express();
app.use(morgan(maskedMorganFormat(createRedactor(), morgan, 'combined')));
```

La línea sale como `"GET /api/cuentas/[CLABE]?curp=[CURP] HTTP/1.1" 200 …`.

## Con otro logger

`maskedRequestView` devuelve una copia enmascarada de la petición para que la escriba el logger que prefieras:

```ts
import { createRedactor } from 'enmascara';
import { maskedRequestView } from 'enmascara-express';

const view = maskedRequestView(createRedactor(), {
  method: 'POST',
  originalUrl: '/api/cuentas/002180032240946700?curp=GODE561231HDFRRN00',
  params: { clabe: '002180032240946700' },
  headers: { authorization: 'Bearer token', 'x-rfc': 'GODE561231GR8' },
  body: { tarjeta: '4242 4242 4242 4242' },
});

'url' in view && view.url; // → '/api/cuentas/[CLABE]?curp=[CURP]'
'params' in view && view.params; // → { clabe: '[CLABE]' }
'headers' in view && view.headers; // → { authorization: '[REDACTED]', 'x-rfc': '[RFC]' }
'body' in view && view.body; // → { tarjeta: '[CARD]' }
```

Llámala cuando escribas la línea: Express llena `req.params` solo cuando una ruta coincide.

En [`examples/express`](https://github.com/finsther/enmascara/tree/main/examples/express) hay un ejemplo ejecutable con pino-http y morgan.

## Qué enmascara

- La URL, con su ruta y su query, tal como la envió el cliente (`originalUrl`).
- La query, los params de la ruta y los headers.
- Los errores que registra pino-http, con su mensaje y su stack.
- Lo que devuelven tus serializers de pino-http y los tokens que registraste en morgan.
- Los headers de credenciales: `authorization`, `proxy-authorization`, `cookie` y `set-cookie` salen como `[REDACTED]`, porque `enmascara` no reconoce tokens ni sesiones.

## Lo que conviene saber

- **El cuerpo no se registra.** `enmascara` detecta CLABE, CURP, RFC y tarjetas, y un cuerpo puede llevar nombres, correos o domicilios. Si decides registrarlo, usa `maskedRequestView(...).body`.
- **Los params llegan en la línea de respuesta.** pino-http serializa la petición al entrar, antes de que una ruta coincida. Si un error pasa con `next(error)` a un manejador de errores de la aplicación, Express ya vació `req.params` y la línea sale con `"params":{}`.
- **No toca `req` ni `res`.** Todo se calcula sobre copias cuando el logger escribe, y las opciones que pasas no se modifican.
- **Tus funciones corren primero.** Los serializers, `customSuccessObject` y `customErrorObject` de pino-http, y tus formatos de morgan, corren antes del enmascarado.
- **Los loggers los pones tú.** El paquete no carga Express, pino-http ni morgan; a morgan lo recibe como parámetro.
- **Falla cerrada.** Si el enmascarado falla, la petición, la respuesta, el error o los params se escriben como `{ enmascara: '[REDACTED]' }`, y la línea de morgan como `[REDACTED]`.

## Licencia

MIT. Ver [LICENSE](LICENSE).
