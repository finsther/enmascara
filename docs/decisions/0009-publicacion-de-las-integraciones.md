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
5. **Ejemplos contra los tarballs.** Un job nuevo de CI construye, empaqueta cada paquete con `npm pack` e instala cada ejemplo en un directorio temporal fuera del workspace con `npm install` de esos tarballs y de las versiones exactas de sus SDK. Luego corre los tests de los ejemplos contra esa copia instalada. Los tests reciben el directorio en `ENMASCARA_PACKED_EXAMPLES`; sin ella prueban el ejemplo del workspace, como hoy. El comando es `pnpm examples:packed`, y el script falla si un paquete quedó instalado como enlace al workspace en vez de como copia.
6. **Manifiestos publicables.** Un test recorre los cuatro `package.json` y falla si `dependencies`, `peerDependencies` u `optionalDependencies` usan `workspace:`, `file:` o `link:`. `devDependencies` sí usa `workspace:*`: npm no las instala en las aplicaciones, y los tests de cada integración necesitan el núcleo del workspace. El núcleo, además, tiene un test de que no declara ninguna dependencia de runtime.
7. **Cero imports de red en los tres bundles.** `enmascara-pino` y `enmascara-express` no importan ningún módulo. `enmascara-sentry` importa solo `@sentry/node`, su `peerDependency`. Ninguno usa APIs de red. Los tres tests usan los mismos detectores que el del núcleo, movidos a un módulo compartido.
8. **Versiones en un PR aparte, después de T1.** Como fija el ADR 0006, `pnpm changeset version` corre a mano en un PR normal. Con los changesets actuales deja `enmascara@0.1.1` y las tres integraciones en 0.1.0. Ese PR no entra hasta que T1 esté hecha; si entrara antes, el release fallaría con el mensaje de la decisión 2 sin publicar nada.

## Consecuencias

- Publicar requiere los pasos manuales de T1 una vez por integración: la reserva 0.0.0 y `npm trust github` con `release.yml` y el environment `npm`.
- El núcleo no puede publicar una versión nueva si una integración tiene una versión mayor que 0.0.0 sin reservar. Es intencional: el release nunca deja una mitad publicada por un error previsible.
- Si una publicación falla a medias, la siguiente corrida etiqueta lo que quedó sin etiqueta y continúa.
- El job de ejemplos agrega un `npm install` por ejemplo al CI de cada PR.

### Lo que se midió al construirlo

- **npm separa el 404 en dos flujos.** `npm view <paquete> versions --json` escribe el JSON del error (`"code": "E404"`) en la salida estándar y las líneas `npm error` en la de errores. La primera versión del adaptador las juntaba, el JSON dejaba de ser legible y un paquete sin reservar parecía un registro caído. Apareció al correr el plan contra npm; un test de `runCommand` lo fija.
- **El plan contra npm el 23 de noviembre** dio `none` para los cuatro paquetes: `enmascara@0.1.0` publicado y etiquetado, y las integraciones en su reserva 0.0.0.
- **Stryker encontró un test que no probaba nada.** El test del orden de dependencias usaba nombres que ya quedaban en orden alfabético. Ahora un paquete `a-integration` depende de `z-core`. Con ese y otros tests nuevos, la mutación de `tools/release` quedó en 100 %, después de quitar una condición que solo cambiaba algo si un paquete se declaraba como su propio peer.
- **Ejemplos contra tarballs, en local:** los tres ejemplos se instalaron desde `enmascara-0.1.0.tgz` y los tarballs 0.0.0 de las integraciones como directorios reales, y sus 18 tests pasaron.

## Cómo publicar la 0.1.0 de las integraciones

1. T1: publicar a mano `enmascara-pino`, `enmascara-express` y `enmascara-sentry` en 0.0.0 y correr `npm trust github` en cada uno con `release.yml` y el environment `npm`.
2. Un PR normal con `pnpm changeset version`: `enmascara@0.1.1` y las tres integraciones en 0.1.0.
3. Al entrar ese PR a `main`, `release.yml` publica los cuatro paquetes en orden, exige su atestación y crea sus etiquetas.

## Seguridad

| Amenaza | Blindaje | Test |
| --- | --- | --- |
| Publicar un paquete que no se puede instalar | Ningún manifiesto publicable usa `workspace:`, `file:` o `link:` | Test de manifiestos |
| Publicar algo distinto de lo probado | Los ejemplos corren contra los mismos tarballs que `npm pack` genera | Job de ejemplos en CI |
| Un bundle de integración abre la red | Solo importa sus `peerDependencies` y no usa APIs de red | Tests de bundle de los tres paquetes |
| Release a medias sin rastro | Se publica en orden y se etiqueta cada paquete al confirmar su atestación; el plan retoma etiquetas faltantes | Tests del plan |
| Publicar sin provenance | El job exige la atestación de cada paquete antes de etiquetarlo y se detiene si no aparece | Tests de `publishRelease` |
| Un error de npm confundido con un paquete sin reservar | Solo un JSON con `E404` de un comando fallido cuenta como paquete sin reservar; cualquier otra respuesta detiene el release | Tests del adaptador de npm |
