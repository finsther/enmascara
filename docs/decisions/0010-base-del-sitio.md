# ADR 0010: Base del sitio

- **Estado:** aceptado
- **Fecha:** 2026-11-24
- **Historia:** Sprint 2, historia 5

## Contexto

La historia 5 monta `apps/site` con Astro y Starlight y deja en verde los controles contra los que se construye el resto del sitio: tokens CSS, tipografías autoalojadas, CSP sin `'unsafe-inline'`, Playwright a 390 y 1440 px, axe, Lighthouse y cero peticiones a otros orígenes. El diseño es el lienzo "Enmascara — Landing" (ocho tableros). Las páginas reales (ring, documentación, landing y patrocina) son de los sprints 3 y 4.

Versiones actuales: Astro 7.4.13, Starlight 0.43.1, Playwright 1.65.1, `@axe-core/playwright` 4.14.1, `@lhci/cli` 0.16.1 y `@fontsource/*` 5.3.0.

### Lo que midió el spike

Antes de este ADR se construyó un sitio desechable con Astro 7.4.13, Starlight 0.43.1 y `security.csp` activado, y se abrió con `astro preview` en Chromium.

1. **Astro hashea sus propios scripts y estilos**, y emite la política en un `<meta http-equiv="content-security-policy">`. La función es estable desde Astro 6.
2. **Starlight rompe la CSP sin `'unsafe-inline'` de dos maneras:**
   - Cinco scripts `is:inline` quedan sin hash: el tema inicial, el proveedor de tema, la apertura de la búsqueda y dos que restauran la barra lateral. El navegador los bloquea.
   - Once valores distintos de atributo `style` (`--sl-icon-size`, `--depth` y los colores de Expressive Code) también se bloquean. Se pierden el resaltado de código y el tamaño de los íconos.
3. **Con esos hashes en la configuración, la página carga sin una sola violación.** Los hashes de atributo van en `style-src-attr` con `'unsafe-hashes'`, que solo permite exactamente esos valores. Astro 7 lo admite con `kind: 'attribute'`.
4. **Pagefind funciona aun sin `'wasm-unsafe-eval'`**, porque compila el WebAssembly en un worker, y un `<meta>` no rige a los workers. Cuando la CSP sea cabecera HTTP (historia 11), la del worker sí lo bloqueará.
5. **La única persistencia de Starlight es `localStorage['starlight-theme']`**, que coincide con la regla de privacidad.
6. Astro advierte que el resaltado Shiki de Markdown es incompatible con la CSP. Starlight no lo usa (usa Expressive Code), así que se apaga con `markdown.syntaxHighlight: false`.

## Decisiones

1. **`apps/site` es un paquete privado del workspace.** `pnpm-workspace.yaml` agrega `apps/*`. La salida es estática (`output: 'static'`) y Starlight sirve la documentación en `/docs/`. Esta historia crea solo dos páginas, que existen para que los controles tengan qué medir:
   - `/`: encabezado del diseño, título y enlace a la documentación.
   - `/docs/`: una página de Introducción.
2. **La CSP lleva una lista de hashes versionada.** Se guarda en `apps/site/csp-hashes.json`, que tiene los hashes de los scripts inline y de los atributos `style`, y se carga en `astro.config.ts`. La política es esta:

   ```text
   default-src 'self'; script-src 'self' 'wasm-unsafe-eval' <hashes de Astro y de la lista>;
   style-src-elem 'self' <hashes de Astro>; style-src-attr 'unsafe-hashes' <hashes de la lista>;
   img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none';
   base-uri 'none'; form-action 'self'
   ```

   - Un test recorre el build y falla si un script inline o un atributo `style` no está en la lista, o si la lista tiene un hash que ya no se usa.
   - `pnpm --filter enmascara-site csp:hashes` regenera la lista.
   - Así, cada script inline nuevo, incluso uno que llegue con una actualización de Starlight, pasa por revisión en un PR. Se descartó calcular los hashes en un hook de build, porque aceptaría en silencio cualquier script nuevo.
3. **D4: se permite `'wasm-unsafe-eval'` en `script-src`.** Pagefind lo necesitará en cuanto la CSP sea cabecera (historia 11), y el `<meta>` y la cabecera deben decir lo mismo. No abre la red ni permite scripts inline ni `eval` de JavaScript: solo compilar WebAssembly del mismo origen. `frame-ancestors` no funciona en `<meta>`, así que espera a la historia 11.
4. **Los tokens se escriben una sola vez, en `apps/site/src/styles/tokens.css`.**
   - **Valores:** tal como vienen en el diseño, sin redondear: colores, familias, tamaños de fuente, interlineados, espaciados y radios.
   - **Nombres:** semánticos (`--color-ink`, `--color-paper`, `--color-accent`, `--font-display`, `--radius-pill`…).
   - **Temas de la documentación:** los dos juegos del tablero "Docs" (claro y oscuro) se asignan a las variables `--sl-color-*` de Starlight, bajo `:root[data-theme='light']` y `:root[data-theme='dark']`.
   - **Acentos alternos:** `#0F6E8C` y `#B3541E` son opciones del editor del lienzo y no entran.
   - **Test:** falla si cualquier `.astro`, `.css`, `.ts` o `.tsx` de `apps/site/src` fuera de `tokens.css` contiene un color literal (hexadecimal, `rgb()`, `hsl()`, `oklch()` o un nombre de color CSS).
5. **Tipografías con `@fontsource`.** Se usan estas, solo con los subconjuntos `latin` y `latin-ext`:

   | Familia | Pesos |
   | --- | --- |
   | Anton | 400 |
   | IBM Plex Sans | 400, 500 y 600 |
   | IBM Plex Mono | 400 y 500 |

   Un test del build falla si algún CSS referencia una fuente de otro origen.
6. **Pruebas del sitio.** Se usan Vitest para los tests sobre el código y el build (tokens, CSP y fuentes) y Playwright con Chromium para el sitio servido con `astro preview`. Cada página se prueba a 390 y a 1440 px:
   - **axe:** cero violaciones con las reglas de WCAG 2.2 AA.
   - **Red:** cero peticiones a otro origen, de cualquier tipo, y cero cookies.
   - **CSP:** cero eventos `securitypolicyviolation`, escuchados desde antes de cargar la página.
   - **Almacenamiento:** `localStorage` termina con a lo sumo la clave `starlight-theme`; `sessionStorage` e IndexedDB terminan vacíos.
   - **Desborde:** sin scroll horizontal a 390 px.
7. **Lighthouse CI.** Corre `lhci autorun` contra el build estático, con mínimo de 0.95 en rendimiento, accesibilidad y buenas prácticas, en perfil móvil y de escritorio. Los resultados quedan como artefacto del job y no se suben a ningún servidor: `upload.target` es `filesystem`.
8. **CI.** Un job `site` hace lo siguiente:
   - Instala, construye el sitio, instala Chromium con `playwright install --with-deps chromium`, corre Playwright y luego Lighthouse.
   - Los tests de Vitest del sitio (tokens, fuentes, CSP y referencias del build) corren en el job de tests, porque `pnpm build` ya construye el sitio.
   - Las acciones nuevas se fijan por SHA, como las existentes.
   - Biome cubre `apps/site`, y `astro check` corre dentro de `pnpm typecheck` con `strict` y `noUncheckedIndexedAccess`. Biome analiza también las plantillas `.astro` (`html.experimentalFullSupportEnabled`); sin eso, marcaba como no usados los componentes que solo aparecen en la plantilla.
   - Dependabot ya vigila el workspace desde `/` con el lockfile de pnpm. Se agrega un grupo `astro` para que Astro, Starlight y sus integraciones suban juntos, porque la lista de hashes cambia con ellos.
9. **Marcadores del diseño.** Se abre un issue con `$[monto]` de los tres niveles, `[correo de contacto]`, la respuesta sobre CFDI, `[versión mínima de Node.js]` (con la nota de que `packages/core` declara `>=22`) y los enlaces a GitHub Sponsors y Open Collective. Ninguno se inventa en el sitio.

## Consecuencias

- Una actualización de Astro o Starlight que cambie un script inline deja el CI en rojo hasta que alguien regenere `csp-hashes.json` y revise la diferencia. Es intencional, aunque los PRs de Dependabot de esas dependencias necesitarán ese paso.
- `'unsafe-hashes'` aparece en la política, pero solo en `style-src-attr` y con hashes exactos. No permite manejadores de eventos (eso sería `script-src-attr`) ni atributos `style` arbitrarios.
- El CI agrega Chromium y Lighthouse, unos minutos por PR.
- La CSP del `<meta>` no protege contra clickjacking ni rige a los workers. La cabecera de la historia 11 completa ambas cosas.

### Lo que se midió al construirlo

- **El botón de búsqueda de Starlight fallaba WCAG 2.5.3** (`label-content-name-mismatch` de axe): su nombre es "Buscar", pero contiene el atajo visible `Ctrl K`, y axe cuenta ese texto aunque tenga `aria-hidden`. El diseño no muestra el atajo, así que `starlight.css` lo oculta. El atajo sigue funcionando y se anuncia con `aria-keyshortcuts`. Se descartó parchear Starlight con `pnpm patch`.
- **Los archivos por subconjunto de Fontsource no traen `unicode-range`.** Importar `latin-400.css` y `latin-ext-400.css` hacía que el navegador descargara las ocho fuentes en cada página, y el titular se reacomodaba al llegar (CLS de 0.3 y rendimiento de 85 en escritorio). `fonts.css` declara ahora cada `@font-face` con el `unicode-range` de Fontsource, y un test lo exige. La página de inicio descarga cuatro fuentes y su CLS es cero.
- **Starlight enlaza `/favicon.svg` y el archivo no existía.** Lighthouse lo vio como error de consola. Un test recorre los `href` y `src` del build y falla si alguno apunta a un archivo que no existe.
- **`astro preview` se va a segundo plano cuando detecta un agente.** Playwright lo arranca con `--ignore-lock`, que lo mantiene en primer plano en cualquier entorno.
- **Resultados en local:** 32 tests de Playwright en verde (390 y 1440 px); Lighthouse con 100 en rendimiento, accesibilidad y buenas prácticas en móvil y escritorio para `/` y `/docs/`; mutación de `apps/site/csp` al 100 %.
- **Advertencias que quedan en el build:** Starlight avisa que no hay colección `i18n`, que no hay página 404 propia y que el sitemap necesita `site`. Las dos primeras son su comportamiento sin traducciones; la tercera se resuelve con el dominio (T3).

## Seguridad

| Amenaza | Blindaje | Test |
| --- | --- | --- |
| Scripts inyectados | CSP sin `'unsafe-inline'`; solo scripts del mismo origen o con hash revisado | Lista de hashes contra el build; Playwright sin `securitypolicyviolation` |
| Un script inline nuevo entra sin revisión | La lista de hashes está versionada y el test falla si falta o sobra un hash | Test de la lista de hashes |
| Rastreo o recursos de terceros | `default-src 'self'`; tipografías con `@fontsource` | Playwright: cero peticiones a otro origen y cero cookies; test de fuentes del build |
| Persistencia no permitida | Solo `starlight-theme` en `localStorage` | Playwright inspecciona el almacenamiento |
| Clickjacking | `frame-ancestors 'none'` como cabecera | Historia 11 |
