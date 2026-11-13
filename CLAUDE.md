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

## Sitio web (apps/site)

El diseño viene del handoff del lienzo "Enmascara — Landing": landing, documentación, el ring y patrocina, cada una en escritorio (1440 px) y móvil (390 px). El diseño es la referencia visual; estas reglas definen cómo se construye.

### Alcance
- El sitio es trabajo del Sprint 2. No lo empieces mientras haya historias abiertas del Sprint 1.
- Astro con Starlight para la documentación, dentro del monorepo en apps/site. Salida estática.
- Antes de codificar, propón las historias del sitio con criterios de aceptación y espera aprobación.

### Fidelidad al diseño
- Los colores, tipografías, espaciados y radios se definen una sola vez como variables CSS (tokens). Ningún componente usa valores hexadecimales directos.
- Tipografías: Anton para títulos, IBM Plex Sans para texto, IBM Plex Mono para código.
- Mobile-first: cada pantalla debe coincidir con su diseño a 390 px y a 1440 px.
- Los marcadores entre corchetes ([monto], [correo de contacto], CFDI, [versión mínima de Node.js]) no se inventan: se dejan visibles y se listan en un issue.

### El ring
- El ring importa el paquete `enmascara` del monorepo. Prohibido copiar la lógica de detección del prototipo del diseño: ese código solo ilustra la experiencia de uso.
- El ring nunca envía ni guarda lo que el usuario escribe: sin fetch, sin almacenamiento. Un test de Playwright verifica que usar el ring no genera ninguna petición de red.

### Privacidad
- Cero analítica, rastreadores, cookies y scripts de terceros.
- Tipografías autoalojadas con @fontsource; nada de Google Fonts por CDN, porque envía la IP del visitante a terceros.
- Content-Security-Policy estricta: default-src 'self'.
- Única persistencia permitida: la preferencia de tema claro u oscuro en localStorage.
- El formulario de lista de espera no se conecta a ningún servicio externo sin aprobación explícita.

### Calidad
- Accesibilidad WCAG 2.2 AA: contraste, navegación con teclado, foco visible, objetivos táctiles de 44 px. axe en CI sin violaciones.
- JavaScript solo en islas interactivas: el ring, el menú móvil, el cambio de tema, las pestañas de instalación y el selector de frecuencia.
- Lighthouse mínimo 95 en rendimiento, accesibilidad y buenas prácticas, verificado en CI.
- Las mismas reglas de TDD, estilo y código de este archivo aplican al sitio: tests de componentes y de Playwright antes de la implementación.