# Spec de Enmascara

`spec/` es la única fuente de verdad de Enmascara. Define qué se detecta, cómo se valida y con qué datos se prueba. Los paquetes de TypeScript, Ruby y Python la implementan y corren los mismos fixtures. Un cambio de comportamiento siempre empieza aquí, con un fixture nuevo.

## Archivos

| Archivo | Qué contiene |
| --- | --- |
| `identifiers.yaml` | Patrón, validador, confianza, allowlist y máscara parcial por tipo |
| `schema.json` | JSON Schema de `identifiers.yaml` |
| `banks.yaml`, `banks.schema.json` | Catálogo de códigos de banco para CLABE |
| `states.yaml`, `states.schema.json` | Catálogo de entidades para CURP |
| `fixtures/*.yaml`, `fixtures.schema.json` | Valores válidos, inválidos y lookalikes por tipo |
| `tools/` | Implementación de referencia que verifica los fixtures; no se publica |
| `scripts/verify-curps.ts` | Prueba local del algoritmo de CURP con CURP reales |

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
| Tarjeta | `check_digit` (Luhn, ignorando espacios y guiones), `network_prefix` (Visa 4 con 16 dígitos, Mastercard 51 a 55 y 2221 a 2720 con 16, American Express 34 y 37 con 15) |

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
