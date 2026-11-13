# Enmascara

> Ningún dato pierde la máscara.

Enmascara encuentra y enmascara identificadores mexicanos en logs, errores y objetos antes de que salgan de tu aplicación. Solo enmascara lo que pasa la validación de su dígito verificador, así que un número de pedido o un timestamp no se confunden con una CLABE.

- Cero dependencias de runtime y sin acceso a la red.
- Funciona en Node 22 o posterior y en el navegador, con ESM y CommonJS.
- Falla cerrada: si algo sale mal al validar, enmascara.

## Qué detecta

| Tipo | Qué es | Cómo se valida |
| --- | --- | --- |
| CLABE | Cuenta interbancaria de 18 dígitos | Código de banco del catálogo de Banxico y dígito verificador |
| CURP | Clave Única de Registro de Población | Estructura, fecha, entidad de nacimiento y dígito verificador |
| RFC | Registro Federal de Contribuyentes, de personas físicas y morales | Estructura, fecha y dígito verificador del SAT |
| Tarjeta | Visa, Mastercard, American Express, Discover, JCB y UnionPay | Prefijo y longitud de la red, y algoritmo de Luhn |

Las reglas viven en [`spec/identifiers.yaml`](spec/identifiers.yaml) y se prueban contra fixtures con sus fuentes oficiales. El algoritmo del dígito verificador de la CURP no está publicado oficialmente; [ADR 0002](docs/decisions/0002-digito-verificador-curp-no-verificado.md) explica cómo se eligió y cómo se verificó.

## Instalación

```bash
npm install enmascara
```

## Uso

```ts
import { createRedactor } from 'enmascara';

const redact = createRedactor();

redact.text('SPEI a 002180032240946700'); // → 'SPEI a [CLABE]'
redact.text('Tarjeta 4242 4242 4242 4242, RFC GODE561231GR8'); // → 'Tarjeta [CARD], RFC [RFC]'
```

`object()` devuelve una copia enmascarada y no toca el original:

```ts
import { createRedactor } from 'enmascara';

const redact = createRedactor();
const payload = {
  cliente: { curp: 'GODE561231HDFRRN00', nota: 'pago con 4242424242424242' },
};

redact.object(payload); // → { cliente: { curp: '[CURP]', nota: 'pago con [CARD]' } }
payload.cliente.curp; // → 'GODE561231HDFRRN00'
```

`findings()` dice qué encontró y dónde, sin devolver el valor:

```ts
import { createRedactor } from 'enmascara';

const redact = createRedactor();

redact.findings('CLABE 002180032240946700'); // → [{ type: 'clabe', start: 6, end: 24, confidence: 'high' }]
```

## Estrategias

| Estrategia | En la API | Resultado |
| --- | --- | --- |
| Máscara completa | `redact` | `[CURP]` |
| Media máscara | `partial` | `****************00`: deja 2 caracteres en CURP y RFC, y 4 en CLABE y tarjetas |
| Incógnito | `hmac` | `[CURP:c14e61]`: misma máscara, mismo luchador. Sirve para correlacionar errores sin ver el dato |

```ts
import { createRedactor } from 'enmascara';

const redact = createRedactor({
  strategy: { default: 'redact', clabe: 'partial', curp: 'hmac' },
  hmacKey: process.env.ENMASCARA_HMAC_KEY,
});

redact.text('clabe=002180032240946700'); // → 'clabe=**************6700'
redact.text('curp=GODE561231HDFRRN00'); // → 'curp=[CURP:c14e61]'
redact.text('rfc=GODE561231GR8'); // → 'rfc=[RFC]'
```

La etiqueta de `hmac` sale de HMAC-SHA256 con tu llave, así que con otra llave verás otra etiqueta. Esta es la de la llave de prueba de la spec. La llave necesita al menos 32 bytes; guárdala como un secreto, nunca en el código.

## Configuración

| Opción | Por omisión | Qué hace |
| --- | --- | --- |
| `detect` | Los 4 tipos | Tipos a detectar: `'clabe'`, `'curp'`, `'rfc'`, `'card'` |
| `strategy` | `'redact'` | Una estrategia para todo, o `{ default, clabe, curp, rfc, card }` |
| `hmacKey` | Ninguna | Llave de `hmac`, como texto o bytes, de al menos 32 bytes |
| `maxInputLength` | 1,000,000 | Caracteres que se revisan por texto; el resto se reemplaza por `[REDACTED]` |
| `maxDepth` | 32 | Niveles de anidación que copia `object()`; lo más profundo pasa a `[MaxDepth]` |

Una configuración inválida lanza `InvalidConfigurationError` al crear el redactor, no al enmascarar. El mensaje nunca repite la llave ni los valores recibidos.

```ts
import { createRedactor, InvalidConfigurationError } from 'enmascara';

try {
  createRedactor({ strategy: 'hmac', hmacKey: 'demasiado corta' });
} catch (error) {
  error instanceof InvalidConfigurationError; // → true
}
```

## Rudos y técnicos

En la lucha libre, los técnicos siguen las reglas y los rudos hacen trampa. Enmascara solo enmascara a los técnicos: valores que cumplen la estructura **y** el dígito verificador. Un número que se parece pero no valida se queda como está.

```ts
import { createRedactor } from 'enmascara';

const redact = createRedactor();

redact.text('CLABE 002180032240946701'); // → 'CLABE 002180032240946701'
redact.text('pedido 4242424242424241'); // → 'pedido 4242424242424241'
redact.text('ts=1729700000123 tel=5512345678'); // → 'ts=1729700000123 tel=5512345678'
```

Los rudos que intentan esconderse tampoco pasan. Enmascara normaliza el texto con NFKC, ignora mayúsculas y quita caracteres invisibles antes de detectar:

```ts
import { createRedactor } from 'enmascara';

const redact = createRedactor();

redact.text('CURP gode561231​hdfrrn00'); // → 'CURP [CURP]'
redact.text('tarjeta ４２４２４２４２４２４２４２４２'); // → 'tarjeta [CARD]'
```

Lo que Enmascara **no** detecta en esta versión:

- Nombres, direcciones, correos y teléfonos: no tienen dígito verificador y darían demasiados falsos positivos.
- Una CURP real cuyo dígito verificador no coincida con el algoritmo publicado en fuentes no oficiales. Ver [ADR 0002](docs/decisions/0002-digito-verificador-curp-no-verificado.md).
- Tarjetas Carnet: sus rangos no son públicos. Ver [ADR 0003](docs/decisions/0003-redes-de-tarjeta.md).

## Seguridad

- Las expresiones regulares son lineales; el CI rechaza cualquier patrón vulnerable a ReDoS.
- Las entradas de 1 MB se enmascaran en menos de 5 segundos, y las más largas se truncan con `[REDACTED]`.
- `object()` copia solo propiedades propias de datos, sin prototipo, con límite de profundidad y detección de ciclos. No ejecuta getters, y un objeto que falla al leerse, como un Proxy que lanza, pasa a `[REDACTED]`.
- El paquete se publica desde GitHub Actions con provenance de npm.

Para reportar una vulnerabilidad, sigue [SECURITY.md](SECURITY.md).

## Rendimiento

<!-- benchmark:start -->
| Escenario | MB/s |
| --- | ---: |
| Logs sin identificadores, `text()` por línea | 51.4 |
| Logs con un identificador cada 20 líneas, `text()` por línea | 50.9 |
| Logs con un identificador en cada línea, `text()` por línea | 39.1 |
| Registros JSON, `object()` | 33.5 |

Medido el 2026-11-13 con Node v24.22.1 en Apple M2, sobre 1 MiB por escenario.
<!-- benchmark:end -->

El corpus son logs sintéticos con timestamps, IDs, montos, teléfonos y números que parecen identificadores pero no validan. Para medir en tu máquina:

```bash
pnpm bench
```

## Licencia

MIT. Ver [LICENSE](LICENSE).
