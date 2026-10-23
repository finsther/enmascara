# ADR 0002: El dígito verificador de CURP no está verificado

- **Estado:** aceptado, pendiente de verificación
- **Fecha:** 2026-10-23
- **Historia:** Sprint 1, historia 2

## Contexto

La posición 18 de la CURP es un dígito verificador. Ni el Instructivo Normativo (DOF, 18 de junio de 2018) ni las Reglas para la asignación de la CURP (2021) publican el algoritmo. Solo dicen que RENAPO lo asigna "a través de la aplicación de un algoritmo". El anexo con el catálogo de entidades tampoco está publicado. El "Manual de Procedimientos" al que remiten no se encontró en gob.mx, el DOF ni datos.gob.mx. El formulario oficial de consulta en gob.mx/curp valida solo el formato; no calcula el dígito.

El único ejemplo completo publicado, `SABC560626MDFLRN09` del Instructivo de 2018, es un caso ilustrativo. Con el algoritmo que circula en fuentes no oficiales da 1, no 9.

## Decisión

1. `spec/tools/check-digits/curp.ts` implementa el algoritmo que circula en fuentes no oficiales:
   - Valores 0 a 9, A a N, Ñ, O a Z → 0 a 36.
   - Pesos de 18 a 2 sobre los primeros 17 caracteres.
   - Dígito = (10 − suma mód 10) mód 10.
2. `spec/fixtures/curp.yaml` declara `verified: false` y no tiene valores con `source: official`. Un test fija que CURP es el único tipo sin verificar.
3. El test `curp.test.ts` contrasta el algoritmo con una implementación independiente en Python, no con una fuente oficial. También deja constancia de que el ejemplo ilustrativo del DOF no valida.
4. La verificación se hará con CURP reales, fuera del repositorio, mediante `spec/scripts/verify-curps.ts`.

## Cómo verificarlo

Copia una o varias CURP reales emitidas por RENAPO (la tuya y las de personas que den su consentimiento), una por línea, y corre:

```bash
pbpaste | pnpm --silent --filter enmascara-spec verify-curps
```

- El script lee de la entrada estándar, así que las CURP no pasan por ningún archivo del repositorio. Solo imprime números de línea y resultados.
- Nunca guardes CURP reales en el repositorio, en issues ni en mensajes de commit.
- **Si todas coinciden:** registra aquí cuántas se probaron y en qué fecha, sin las CURP, y cambia el estado a "verificado con datos reales". `verified` sigue en `false` mientras no haya una fuente oficial.
- **Si alguna no coincide:** el algoritmo está mal o incompleto. Reabre esta decisión antes de la historia 4.

## Consecuencias

- Si el algoritmo estuviera mal, una CURP real con un dígito verificador distinto al calculado no se enmascararía. Mientras no se verifique, el riesgo es un falso negativo, que es justo lo que Enmascara debe evitar.
- La historia 4 (validadores de CURP y RFC) debe decidir qué hacer cuando una CURP cumple el patrón, la fecha y la entidad pero falla el dígito. Una opción es tratarla con confianza media en lugar de descartarla.
