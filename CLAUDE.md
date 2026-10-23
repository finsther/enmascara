# Enmascara

Lee docs/sprint-1.md antes de cada historia. Las secciones Estándares de ingeniería, TDD y Modelo de amenazas son obligatorias.

## Flujo de trabajo
- TDD estricto: primero el test que falla, luego el código mínimo, luego refactor.
- Un commit `test:` antes de cada `feat:` o `fix:`. Nunca código de producción sin su test previo.
- Muestra el test fallando antes de escribir la implementación.
- No avances de historia sin aprobación.

## Estilo
- TypeScript: Google TypeScript Style Guide, Biome estricto, tsc --strict con noUncheckedIndexedAccess.
- Ruby: The Ruby Style Guide con RuboCop. Python: PEP 8 con Ruff y mypy strict. Rust: rustfmt y Clippy pedantic.
- Cero advertencias del linter. No desactives reglas para hacer pasar el código.

## Código
- Sin comentarios en el código interno. Si algo necesita explicación, renombra o extrae una función.
- Excepción: todo lo exportado lleva documentación de API (TSDoc, YARD, docstrings PEP 257, rustdoc) con descripción, parámetros, retorno, errores y un ejemplo. Nunca explica la implementación.
- Nombres completos y comunes. Sin abreviaciones salvo siglas de dominio: CLABE, CURP, RFC, NSS, HMAC.
- SOLID, funciones pequeñas, sin booleanos como parámetros de comportamiento, sin números mágicos.
- Inmutabilidad por omisión. Errores tipados; nunca null como señal de fallo.
- Puertos y adaptadores: el núcleo no importa pino, Express ni Sentry.
- Patrones: Strategy para estrategias, Registry para validadores, Factory en createRedactor, Adapter en integraciones.

## Seguridad
- El paquete `enmascara` no tiene dependencias de runtime. Ningún paquete importa módulos de red.
- Toda regla de detección vive en spec/identifiers.yaml.
- Normaliza la entrada (NFKC, sin caracteres invisibles) antes de detectar.
- Regex lineales; el chequeo ReDoS de CI decide.
- Falla cerrada: ante un error, se enmascara.
- Ningún mensaje de error incluye el valor detectado.
- redact.object() devuelve una copia, sin prototipo, solo propiedades propias de datos, con límite de profundidad y detección de ciclos.
- Cada amenaza del modelo tiene su test.

## Verificación
- No afirmes que un algoritmo es correcto sin fixtures que lo prueben contra fuentes oficiales.
- Cobertura mínima 95 % en el núcleo y pruebas de mutación en verde.
- Commits convencionales y un changeset por cambio publicable.
