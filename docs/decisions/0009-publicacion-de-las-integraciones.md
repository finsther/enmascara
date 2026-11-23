# ADR 0009: Publicación de las integraciones

- **Estado:** aceptado
- **Fecha:** 2026-11-23
- **Historia:** Sprint 2, historia 4

## Contexto

`release.yml` publica solo `enmascara`. Lee la versión de `packages/core/package.json` y, si npm no la tiene, publica con trusted publishing, exige la atestación SLSA y crea la etiqueta `enmascara@<versión>` (ADR 0006). La historia 4 pide lo mismo para cada paquete cuya versión no esté en npm.

Estado al 23 de noviembre:

| Paquete | Versión en `main` | En npm | Changesets pendientes |
| --- | --- | --- | --- |
| `enmascara` | 0.1.0 | 0.0.0 y 0.1.0 | `keep-error-stack` y `keep-key-order` (patch) |
| `enmascara-pino` | 0.0.0 | No existe | `masked-pino-logger` (minor) |
| `enmascara-express` | 0.0.0 | No existe | `masked-express-loggers` (minor) |
| `enmascara-sentry` | 0.0.0 | No existe | `masked-sentry-options` (minor) |

Trusted publishing solo se configura sobre un paquete que ya existe. Por eso las tres integraciones necesitan su reserva 0.0.0, publicada a mano (tarea T1), antes de que el CI pueda publicarlas.

Las integraciones declaran `enmascara` como `peerDependency` con `^0.1.0`, sin el protocolo `workspace:`. `npm publish` no reescribe ese protocolo: si apareciera, el paquete publicado sería imposible de instalar. Los ejemplos dependen de los paquetes con `workspace:*`, así que hoy prueban el código del workspace y no lo que se publica.

## Decisiones

1. **El plan de publicación es código probado.** Un paquete privado, `tools/release`, calcula qué hacer con cada paquete publicable a partir de su `package.json`, de las versiones que npm reporta y de las etiquetas del repositorio. Lo hace con puertos: los tests usan un registro y un repositorio falsos, y el workflow usa `npm view` y `git ls-remote`. Sigue las mismas reglas de cobertura, mutación y estilo que el núcleo. El YAML solo ejecuta.
2. **Qué hace el plan con cada paquete:**

   | Situación | Resultado |
   | --- | --- |
   | La versión ya está en npm y la etiqueta existe | Nada |
   | La versión ya está en npm y falta la etiqueta | Solo etiqueta, porque una corrida anterior falló después de publicar |
   | El paquete existe en npm y la versión no | Publicar y etiquetar |
   | La versión es 0.0.0 | Nada: 0.0.0 es la reserva y el CI nunca la publica |
   | El paquete no existe en npm y la versión no es 0.0.0 | Error antes de publicar cualquier paquete; el mensaje pide la reserva de T1 |

   Así esta historia puede llegar a `main` antes de T1: mientras las integraciones sigan en 0.0.0, el release solo atiende al núcleo.
3. **Un job, en orden de dependencias.** El núcleo va primero y luego las integraciones en orden alfabético. Cada paquete se publica con `npm publish` desde su directorio, espera su atestación y recibe su etiqueta `<nombre>@<versión>` antes de pasar al siguiente. Si uno falla, los siguientes no salen; volver a correr el workflow retoma desde ahí, porque el plan omite lo ya publicado.
4. **Los mismos controles antes de publicar.** Lint, typecheck, cobertura y los ejemplos contra los tarballs. Se descartó una matriz de jobs: trusted publishing y el environment `npm` se aprueban una vez por job, y el orden importa.
5. **Ejemplos contra los tarballs.** Un job nuevo de CI construye, empaqueta cada paquete con `npm pack` e instala cada ejemplo en un directorio temporal fuera del workspace con `npm install` de esos tarballs y de las versiones exactas de sus SDK. Luego corre los tests de los ejemplos contra esa copia instalada. Los tests reciben el directorio por una variable de entorno; sin ella prueban el ejemplo del workspace, como hoy.
6. **Manifiestos publicables.** Un test recorre los cuatro `package.json` y falla si algún campo de dependencias usa `workspace:`, `file:` o `link:`.
7. **Cero imports de red en los tres bundles.** `enmascara-pino` y `enmascara-express` no importan ningún módulo. `enmascara-sentry` importa solo `@sentry/node`, su `peerDependency`. Ninguno usa APIs de red. Los tres tests usan los mismos detectores que el del núcleo, movidos a un módulo compartido.
8. **Versiones en un PR aparte, después de T1.** Como fija el ADR 0006, `pnpm changeset version` corre a mano en un PR normal. Con los changesets actuales deja `enmascara@0.1.1` y las tres integraciones en 0.1.0. Ese PR no entra hasta que T1 esté hecha; si entrara antes, el release fallaría con el mensaje de la decisión 2 sin publicar nada.

## Consecuencias

- Publicar requiere los pasos manuales de T1 una vez por integración: la reserva 0.0.0 y `npm trust github` con `release.yml` y el environment `npm`.
- El núcleo no puede publicar una versión nueva si una integración tiene una versión mayor que 0.0.0 sin reservar. Es intencional: el release nunca deja una mitad publicada por un error previsible.
- Si una publicación falla a medias, la siguiente corrida etiqueta lo que quedó sin etiqueta y continúa.
- El job de ejemplos agrega un `npm install` por ejemplo al CI de cada PR.

## Seguridad

| Amenaza | Blindaje | Test |
| --- | --- | --- |
| Publicar un paquete que no se puede instalar | Ningún manifiesto publicable usa `workspace:`, `file:` o `link:` | Test de manifiestos |
| Publicar algo distinto de lo probado | Los ejemplos corren contra los mismos tarballs que `npm pack` genera | Job de ejemplos en CI |
| Un bundle de integración abre la red | Solo importa sus `peerDependencies` y no usa APIs de red | Tests de bundle de los tres paquetes |
| Release a medias sin rastro | Se publica en orden y se etiqueta cada paquete al confirmar su atestación; el plan retoma etiquetas faltantes | Tests del plan |
| Publicar sin provenance | El job exige la atestación de cada paquete antes de etiquetarlo | Paso del workflow, como en el ADR 0006 |
