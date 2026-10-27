# ADR 0001: Fixtures sintéticos anclados en fuentes oficiales

- **Estado:** aceptado
- **Fecha:** 2026-10-23
- **Historia:** Sprint 1, historia 2

## Contexto

Los fixtures de `spec/fixtures/` son el contrato que TypeScript, Ruby y Python deben cumplir. Hacen falta al menos 30 valores válidos, 30 inválidos y 20 lookalikes por tipo, y CLAUDE.md pide no afirmar que un algoritmo es correcto sin probarlo contra fuentes oficiales.

Las fuentes oficiales publican los algoritmos, pero casi ningún ejemplo completo. Usar CURP, RFC, CLABE o tarjetas de personas reales expondría justo el tipo de dato que Enmascara existe para proteger.

## Decisión

1. **Datos 100 % sintéticos.** Los únicos valores reales son los ejemplos publicados por fuentes oficiales. Cada uno lleva `source: official` y su `reference`.
2. **Un generador con semilla fija** (`spec/tools/generator`, mulberry32, semilla `20261023`) produce los valores válidos e inválidos. Cada inválido tiene un único defecto.
3. **Una implementación de referencia** (`spec/tools/rules`) clasifica cada fixture. Los tests exigen que la etiqueta de cada fixture coincida con esa clasificación. Las anclas oficiales y los motivos de los lookalikes se calcularon además con un verificador independiente en Python.
4. **La implementación de referencia vive en `spec/`, no en `packages/core`.** Duplica la aritmética que tendrán los validadores del núcleo, y así cada implementación revisa a la otra. Tiene su propio umbral de cobertura (95 %) y de mutación (90 %).

## Fuentes y huecos

| Tipo | Ancla oficial | Hueco |
| --- | --- | --- |
| CLABE | Banxico, Circular 12/2018, Anexo 4: algoritmo y la CLABE de ejemplo `002180032240946700` | No hay catálogo oficial de prefijos de 3 dígitos. `banks.yaml` toma los últimos 3 dígitos de los 97 códigos de 5 dígitos del endpoint CEP de Banxico (consultado el 2026-10-23). El Anexo 4 establece esa regla solo para instituciones de fondos de pago electrónico; para bancos es una inferencia. |
| CURP | RENAPO: las 33 claves de entidad, incluida `NE`, del formulario oficial en gob.mx/curp; la regla de la posición 17 en las Reglas de 2021, sección 5.2 | No hay fuente oficial del algoritmo del dígito verificador. Ver [ADR 0002](0002-digito-verificador-curp-no-verificado.md). |
| RFC | SAT, respuesta a la solicitud de información 0610100135506 (2006): algoritmo y `GODE561231GR8`. SAT, Anexo 20: `COR391215F4A` y `PAL7202161U0` | El PDF del algoritmo solo está publicado en un sitio no oficial. `FME170920PW1`, del mismo Anexo 20, solo valida si el espacio de relleno vale 0 en vez de 37; se excluyó porque contradice a los otros dos ejemplos de persona moral y a la tabla del SAT. `XAXX010101000` no pasa el dígito verificador y depende de la allowlist. |
| Tarjeta | Mastercard Rules (2 de junio de 2026): rangos 51 a 55 y 2221 a 2720 con 16 dígitos. Guía de American Express: 34 y 37 con 15 dígitos en grupos 4-6-5. Tarjetas de prueba publicadas por Stripe | El texto de Luhn (ISO/IEC 7812-1, Anexo B) es de pago. Las reglas públicas de Visa no dicen "prefijo 4, 16 dígitos"; se asumió así. |

## Consecuencias

- Los fixtures se pueden publicar y compartir sin exponer a nadie.
- Una CLABE con un código de banco fuera del catálogo no se enmascara. Si un banco deja de existir, sus CLABE viejas en logs tampoco se enmascaran. `banks.yaml` registra la fecha de consulta para actualizarlo.
- Con la regla actual no se enmascaran tarjetas de otras redes (Carnet, Discover, JCB, UnionPay). Stripe publica una Carnet de prueba, `5062210000000009`, que quedó fuera de los fixtures. Queda pendiente decidirlo; la propuesta es resolverlo en la historia 3 con fuentes oficiales de cada red.
- Los patrones solo cubren mayúsculas, así que la normalización de mayúsculas y minúsculas le toca al motor (historia 5).
- Ningún inválido usa un prefijo de una red de tarjetas real, para que ningún fixture marque como seguro de registrar un número de tarjeta real. Los prefijos inválidos son industrias de ISO/IEC 7812 ajenas a las tarjetas (1, 7, 8, 9) o prefijos de red con la longitud equivocada.
