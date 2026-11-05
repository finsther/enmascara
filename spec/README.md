# Spec de Enmascara

`spec/` es la única fuente de verdad de Enmascara. Define qué se detecta, cómo se valida y con qué datos se prueba. Los paquetes de TypeScript, Ruby y Python la implementan y corren los mismos fixtures. Un cambio de comportamiento siempre empieza aquí, con un fixture nuevo.

## Archivos

| Archivo | Qué contiene |
| --- | --- |
| `identifiers.yaml` | Patrón, validador, confianza, allowlist y máscara parcial por tipo |
| `schema.json` | JSON Schema de `identifiers.yaml` |
| `banks.yaml`, `banks.schema.json` | Catálogo de códigos de banco para CLABE |
| `states.yaml`, `states.schema.json` | Catálogo de entidades para CURP |
| `card-networks.yaml`, `card-networks.schema.json` | Redes de tarjeta con sus prefijos, longitudes y fuentes |
| `fixtures/*.yaml`, `fixtures.schema.json` | Valores válidos, inválidos y lookalikes por tipo |
| `fixtures/texts.yaml`, `texts.schema.json` | Líneas de texto y su salida con la estrategia `redact` |
| `fixtures/strategies.yaml`, `strategies.schema.json` | Valores enmascarados con `redact`, `partial` y `hmac` bajo una llave de prueba |
| `tools/` | Implementación de referencia que verifica los fixtures; no se publica |
| `scripts/verify-curps.ts` | Prueba local del algoritmo de CURP con CURP reales |
| `scripts/generate-core-catalogs.ts` | Genera los catálogos JSON que empaqueta el núcleo |

## `identifiers.yaml`

```yaml
curp:
  pattern: "(?<![A-Z0-9])[A-Z]{4}[0-9]{6}[HMX][A-Z]{5}[A-Z0-9][0-9](?![A-Z0-9])"
  validator: curp_checksum
  confidence: high
  mask:
    partial:
      last: 2
```

- **`pattern`**: se escribe en el subconjunto de regex que JavaScript, Ruby y Python interpretan igual:
  - `[0-9]` en lugar de `\d`, porque en Python `\d` acepta dígitos de cualquier escritura.
  - Lookarounds de ancho fijo en lugar de `\b`, porque `\b` no separa un valor pegado a `_` o a una letra (`id_002180032240946700`).
  - Solo mayúsculas. Normalizar la entrada antes de detectar le toca al motor.
- **`validator`**: nombre de la función que cada lenguaje implementa: `clabe_checksum`, `curp_checksum`, `rfc_checksum` o `card_checksum`. La spec no contiene código.
- **`allowlist`**: valores que pasan la validación pero nunca se enmascaran, como los RFC genéricos.
- **`mask.partial.last`**: caracteres finales que deja visibles la estrategia `partial`. El schema no permite más de 4. En CURP y RFC no permite más de 2, porque las posiciones 5 a 10 son la fecha de nacimiento.

Las claves son de una sola palabra para que los tres lenguajes las lean sin convertir entre snake_case y camelCase.

## Qué rechaza cada validador

Cada validador revisa en este orden y se detiene en el primer fallo:

| Tipo | Revisiones |
| --- | --- |
| CLABE | `check_digit` (pesos 3, 7, 1 módulo 10), `bank_code` (los 3 primeros dígitos en `banks.yaml`) |
| CURP | `check_digit` (pesos 18 a 2 módulo 10), `date` (la posición 17 fija el siglo: dígito hasta 1999, A a J desde 2000), `state` (posiciones 12 y 13 en `states.yaml`) |
| RFC | `check_digit` (pesos 13 a 2 módulo 11; las morales se rellenan con un espacio al inicio), `date` (la fecha debe existir en el siglo XX o en el XXI) |
| Tarjeta | `check_digit` (Luhn, ignorando espacios y guiones), `network_prefix` (prefijo y longitud de alguna red de `card-networks.yaml`) |

## Fixtures

Cada archivo tiene:

- **`verified`**: indica si el algoritmo del dígito verificador lo confirma una fuente oficial. Solo CURP está en `false`; ver [ADR 0002](../docs/decisions/0002-digito-verificador-curp-no-verificado.md).
- **`valid`**: al menos 30 valores que se deben detectar. Los que vienen de una fuente oficial llevan `source: official` y su `reference`.
- **`invalid`**: al menos 30 valores que cumplen el patrón pero fallan por un único motivo, declarado en `reason`.
- **`lookalikes`**: al menos 20 líneas de log que no contienen el identificador. Su `reason` explica por qué:
  - `pattern`: nada en la línea coincide con el patrón.
  - `allowlist`: lo que coincide está en la allowlist.
  - Cualquier otro motivo: lo cumple cada coincidencia de la línea.

Ningún fixture es dato de una persona real. Los valores generados salen de `tools/generator` con la semilla `20261023`, y volver a correrlo los reproduce. Los lookalikes están escritos a mano. Ver [ADR 0001](../docs/decisions/0001-fixtures-sinteticos.md).

Los tests de `test/` verifican que cada fixture esté etiquetado exactamente como lo clasifica la implementación de referencia. Para correrlos:

```bash
pnpm test
```

## Probar el algoritmo de CURP con CURP reales

El script lee CURP de la entrada estándar y solo imprime números de línea y resultados; nunca repite una CURP. No escribas CURP reales en ningún archivo del repositorio.

```bash
pbpaste | pnpm --silent --filter enmascara-spec verify-curps
```

Termina con código 1 si algún dígito verificador no coincide.

## Catálogos del núcleo

El paquete `enmascara` no puede leer YAML en tiempo de ejecución. Después de cambiar `banks.yaml` o `card-networks.yaml`, regenera las copias JSON del núcleo:

```bash
pnpm --filter enmascara-spec generate-core-catalogs
```

Si alguna copia deja de coincidir con la spec, `test/core-catalogs.test.ts` falla.

## Fixtures de texto del motor

`fixtures/texts.yaml` compara líneas completas con su salida esperada, no posiciones, para que cada lenguaje cuente caracteres a su manera. Cada identificador detectado se reemplaza por su tipo en mayúsculas entre corchetes: `[CLABE]`, `[CURP]`, `[RFC]` o `[CARD]`.

Antes de detectar, el motor normaliza el texto. Aplica NFKC, pasa todo a mayúsculas y quita los caracteres `Default_Ignorable_Code_Point`. Lo que enmascara es el tramo original completo. Ver [ADR 0004](../docs/decisions/0004-motor-de-deteccion.md).

Biome no formatea este archivo, porque reescribiría los escapes `\u200B` como caracteres invisibles. Un test falla si aparece alguno.

## Fixtures de estrategias

`fixtures/strategies.yaml` fija la salida exacta de cada estrategia:

- **`partial`:** deja los últimos `mask.partial.last` caracteres del valor canónico y reemplaza el resto por `*`.
- **`hmac`:** escribe `[TIPO:hhhhhh]`, con los primeros 6 caracteres hex de HMAC-SHA256 sobre `tipo:valor canónico`, con la llave UTF-8 del archivo.

El valor canónico se obtiene con NFKC por carácter, mayúsculas, sin caracteres `Default_Ignorable_Code_Point` y solo con `0-9`, `A-Z`, `Ñ` y `&`. La llave del archivo es solo de prueba. Ver [ADR 0005](../docs/decisions/0005-estrategias-de-enmascarado.md).
