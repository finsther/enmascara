# ADR 0006: Benchmark, README y publicación

- **Estado:** aceptado
- **Fecha:** 2026-11-10
- **Historia:** Sprint 1, historia 9

## Contexto

La definición de terminado del sprint pide el paquete publicado con provenance y un benchmark publicado en el README. El plan fija tinybench y deja el umbral de regresión del CI para después de la primera medición. Trusted publishing de npm solo se puede configurar sobre un paquete que ya existe (`npm help trust`: "The package you're configuring must already exist"), y `enmascara` aún no está en npm.

## Decisiones

### Benchmark

- **Corpus sintético y determinista.** `bench/src/corpus.ts` genera logs con semilla fija: timestamps, IDs de request en hexadecimal, montos, teléfonos de 10 dígitos y, en una de cada 10 líneas, un valor de la spec que falla solo su dígito verificador. Los identificadores válidos salen de los fixtures de la spec y rotan entre los cuatro tipos.
- **Cuatro escenarios de 1 MiB:**

  | Escenario | Contenido | Llamada |
  | --- | --- | --- |
  | Logs limpios | Sin identificadores | `text()` por línea |
  | Logs mixtos | Uno cada 20 líneas | `text()` por línea |
  | Logs densos | Uno en cada línea | `text()` por línea |
  | Registros | Uno cada 20 registros | `object()` sobre el arreglo |

  Por línea, porque así llama un logger. Eso también evita el límite de `maxInputLength`.
- **Un test fuerte del corpus.** En cada escenario, a tamaño completo, Enmascara debe enmascarar exactamente los identificadores sembrados. Si el ruido del log produjera un falso positivo, el test fallaría.
- **MB/s con MB = 10^6 bytes UTF-8**, sobre la latencia media de tinybench (2 s por escenario y 0,5 s de calentamiento).
- **README sincronizado.** `pnpm bench` escribe `bench/results.json` y la tabla entre `<!-- benchmark:start -->` y `<!-- benchmark:end -->`. Un test falla si la tabla no coincide con `results.json`.
- **Piso en CI.** El job `benchmark` corre `pnpm bench:check`, publica la tabla en el resumen del job y falla si un escenario queda bajo su piso en `bench/thresholds.json`. Los pisos actuales son provisionales, un cuarto de la medición local. Se fijan al 50 % de la primera medición en un runner de GitHub, porque los runners compartidos varían mucho.

### README

- **En español.** El público inicial está en México y Latinoamérica, y `SECURITY.md` ya está en español. La API sigue en inglés.
- **Ejemplos ejecutados.** Cada bloque `ts` del README corre en un proceso de Node nuevo contra el paquete construido. Una línea que termina en `// → valor` se vuelve una aserción.
- **Una sola fuente.** El README y la licencia viven en la raíz del repositorio. `packages/core` lleva copias exactas porque npm empaqueta los archivos del directorio del paquete, y un test falla si dejan de coincidir. Se descartó un script `prepack`, para que el paquete no tenga scripts de ciclo de vida.

### Publicación

- **Trusted publishing, sin tokens.** `release.yml` publica con OIDC desde GitHub Actions; npm genera la provenance. El job corre en el environment `npm`, que puede pedir aprobación manual, y solo cuando la versión de `packages/core` no está en npm.
- **`npm publish`, no `pnpm publish`.** Hay reportes de que pnpm degrada un intercambio OIDC fallido a una advertencia y publica sin autenticación de confianza. El job exige npm 11.5.1 o posterior, el mínimo de trusted publishing.
- **Provenance comprobada.** Después de publicar, el job falla si `npm view` no muestra una attestation.
- **Tag por API.** El tag `enmascara@<versión>` se crea con `gh api`, así que el checkout no guarda credenciales.
- **Versión en un PR normal.** `pnpm changeset version` se corre a mano en un PR. Así el CI corre sobre ese PR, cosa que no pasa con un PR abierto por `changesets/action` con `GITHUB_TOKEN`.
- **Reserva con 0.0.0.** Como trusted publishing requiere que el paquete exista, la primera versión es una reserva publicada a mano, sin código. La 0.1.0 es la primera que sale del CI con provenance.
- **El tarball, vigilado.** Un test exige que `npm pack` contenga solo los bundles, sus tipos, el README, la licencia y `package.json`. También exige que no haya scripts de ciclo de vida y que `repository` apunte a `finsther/enmascara`, que es lo que npm compara al aceptar la provenance.

## Consecuencias

- La primera medición, en un Apple M2 con Node 24, da cerca de 4 MB/s con `text()` y 9 MB/s con `object()`. Un perfil rápido atribuye cerca del 85 % del tiempo de `text()` a la normalización Unicode carácter por carácter. Es el primer lugar para optimizar.
- Los pisos del CI detectan regresiones grandes, no pequeñas: el ruido de los runners compartidos no permite más.
- Publicar requiere pasos manuales una sola vez: 2FA en npm, la reserva 0.0.0, `npm trust github` y el environment `npm` en GitHub.
