# ADR 0003: Redes de tarjeta en un catálogo con fuentes oficiales

- **Estado:** aceptado
- **Fecha:** 2026-10-28
- **Historia:** Sprint 1, historia 3

## Contexto

Hasta la historia 2, la regla de tarjeta solo aceptaba Visa, Mastercard y American Express, en una tabla escrita en el código. Una tarjeta Carnet, Discover, JCB o UnionPay pasaba Luhn pero no se enmascaraba. Además, CLAUDE.md pide que toda regla de detección viva en la spec.

Había dos opciones:

- **A:** un catálogo explícito de redes, cada una con fuente oficial.
- **B:** enmascarar cualquier número de 15 o 16 dígitos que pase Luhn y empiece con 2 a 6.

B cubría cualquier red, pero a costa de más falsos positivos: IMEI, IDs internos y alrededor del 4 % de los IDs numéricos de 16 dígitos.

## Decisión

Se eligió la opción A. Las redes viven en `spec/card-networks.yaml` con sus fuentes y la fecha de consulta. El núcleo recibe una copia generada en `packages/core/src/catalogs/card-networks.json`, y un test de la spec falla si deja de coincidir.

| Red | Prefijos | Longitud en este sprint | Fuente |
| --- | --- | --- | --- |
| Visa | 4 | 16 | FAQ de Visa sobre BIN de 8 dígitos: "Visa has an ample supply of issuing BINs with the "4" prefix"; la longitud del PAN sigue en 16 o 19 |
| Mastercard | 22210000–27209999, 51000000–55999999 | 16 | Mastercard Rules (2 de junio de 2026) |
| American Express | 34, 37 | 15 | Guía de comercios de American Express |
| Discover, Diners Club International y PULSE | 30000000–30599999, 30950000–30959999, 36, 38–39, 6011, 64400000–65899999 | 16 | Global Payment Network – IIN Range Summary de Discover (PDF del 18 de septiembre de 2026) |
| JCB | Filas que Discover marca como JCB, entre ellas 35280000–35899999 | 16 | Tabla de Discover; el sitio de JCB dice que sus tarjetas tienen 16 dígitos |
| UnionPay | 62, 81000000–81719999 | 16 | UnionPay International ("starting with 62") y la fila de Discover marcada como UnionPay |

- **Visa** pasó de ser una suposición a tener fuente oficial.
- **Discover, Diners Club y PULSE** comparten una sola entrada, porque la tabla de Discover no dice a cuál de las tres pertenece cada fila.
- **UnionPay** usa el 62 completo porque la tabla de Discover solo lista los rangos que Discover enruta. Por ejemplo, deja fuera el 6200, donde cae la tarjeta de prueba UnionPay de Stripe.

## Fuera del catálogo

- **Carnet:** ninguna fuente oficial publica sus rangos. Por decisión del equipo queda fuera y documentada. La tarjeta de prueba de Stripe (`5062210000000009`) no se enmascara.
- **Maestro, Elo, RuPay, Mir y BC Card:** no se encontró una publicación oficial de su propia red.
- **Longitudes de 14 dígitos** (Diners clásica) **y de 17 a 19** (Discover, JCB, UnionPay, Visa): el patrón de este sprint solo detecta 15 y 16 dígitos. Ampliarlo es un cambio de patrón con su propia revisión de ReDoS y de falsos positivos.

## Consecuencias

- Cada prefijo enmascarado se puede rastrear hasta una publicación oficial.
- Una tarjeta Carnet o de otra red fuera del catálogo no se enmascara: es un falso negativo conocido. Si aparece una fuente oficial de Carnet, basta con agregarla al catálogo, regenerar `card-networks.json` y sumar su ancla a los fixtures.
- El catálogo envejece. `retrieved` dice cuándo se consultó cada fuente, para revisarla periódicamente.
