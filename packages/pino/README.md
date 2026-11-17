# enmascara-pino

> Ningún dato pierde la máscara, tampoco en tus logs.

Crea un logger de [pino](https://getpino.io) que enmascara CLABE, CURP, RFC y tarjetas antes de escribir cada línea. Usa [`enmascara`](https://github.com/finsther/enmascara#readme), así que solo enmascara lo que pasa la validación del dígito verificador.

## Instalación

```bash
npm install enmascara enmascara-pino pino
```

Funciona con pino 9 y 10, en Node 22 o posterior.

## Uso

Pásale a `createMaskedLogger` tu redactor, la función `pino` y tus opciones de siempre:

```ts
import { createRedactor } from 'enmascara';
import { createMaskedLogger } from 'enmascara-pino';
import { pino } from 'pino';

const logger = createMaskedLogger(createRedactor(), pino, { level: 'silent' });

logger
  .child({ curp: 'GODE561231HDFRRN00' })
  .info('SPEI a %s', '002180032240946700');
```

Con un nivel que escriba, la línea sale con `"curp":"[CURP]"` y `"msg":"SPEI a [CLABE]"`. El redactor acepta las mismas opciones de siempre, por ejemplo `createRedactor({ strategy: 'partial' })` para dejar los últimos dígitos visibles.

En [`examples/pino`](https://github.com/finsther/enmascara/tree/main/examples/pino) hay un ejemplo ejecutable con un logger hijo, un objeto, un mensaje con argumentos y un error.

## Qué enmascara

- El objeto que registras, incluidas sus claves.
- El mensaje, después de interpolar sus argumentos (`%s`, `%d`, `%o`).
- Los errores, con su mensaje y su stack.
- Los mixins.
- Los bindings del logger, de sus hijos y de los descendientes de estos.

## Lo que conviene saber

- **Tus formatters, serializers y `redact` corren primero.** Enmascara trabaja sobre lo que producen.
- **No toca tus opciones.** Las que pasas no se modifican.
- **Pino lo pones tú.** El paquete recibe la función `pino` como parámetro y nunca la carga por su cuenta.
- **Falla cerrada.** Si el enmascarado falla, el mensaje se escribe como `[REDACTED]` y el objeto o los bindings como `{ enmascara: '[REDACTED]' }`.

## Licencia

MIT. Ver [LICENSE](LICENSE).
