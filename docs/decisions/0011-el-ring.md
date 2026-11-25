# ADR 0011: El ring

- **Estado:** aceptado
- **Fecha:** 2026-11-25
- **Historia:** Sprint 3, historia 6

## Contexto

El ring es la página `/ring` donde cualquiera pega texto y ve cómo Enmascara lo enmascara, más una versión compacta que usará la landing (Sprint 4). Es la primera vez que el núcleo corre en el navegador. El diseño son los tableros "El ring" y "El ring · móvil" del lienzo "Enmascara — Landing"; su prototipo calcula sus propios resultados y no se copia.

D2 se decidió el 25 de noviembre (`docs/sprint-3.md`): el ring no muestra filas "Ignorado" ni el conteo de números ignorados, porque `findings()` solo devuelve hallazgos validados.

El plan pide que este ADR registre cómo se hidrata la isla, el tamaño de su bundle y la llave de demostración.

## Decisiones

1. **Una isla sin framework, con dos presentaciones.**
   - `Ring.astro` recibe `variant: 'full' | 'compact'` y escribe el HTML estático de los controles, la entrada, la salida, la tabla y el panel de código.
   - Un `<script>` del componente carga `ring-island.ts`. Astro lo empaqueta como módulo del mismo origen en `/_astro/`, así que la CSP `script-src 'self'` lo permite sin hash nuevo.
   - Se descartó React o Preact: agregarían peso al bundle sin dar nada que el DOM no resuelva para cinco controles.
2. **Hidratación.**
   - `/ring` arranca la isla en cuanto carga el módulo.
   - La versión compacta la arranca cuando entra a la vista, con `IntersectionObserver` e `import()` dinámico del controlador. Así el núcleo no se descarga si el visitante nunca llega al ring de la landing.
   - El modo sale de `data-ring-hydration="load" | "visible"`, que escribe `Ring.astro` según la variante.
3. **El ring importa `enmascara` del workspace** (`workspace:*`): `createRedactor` y los tipos `IdentifierType`, `Finding`, `RedactorOptions` y `StrategyName`, y nada más. No define expresiones regulares de detección ni validadores. Un test estático recorre `apps/site/src/ring` y falla si encuentra un literal de expresión regular, un `new RegExp` o un import que no sea `enmascara` o un módulo del propio ring.
4. **Núcleo puro y adaptador del DOM.** `apps/site/src/ring/` separa:
   - Módulos puros, sin DOM y con Vitest, mutación y cobertura: opciones del ring, ejecución del redactor, filas de hallazgos, el panel "Lo mismo en tu código" y los ejemplos.
   - El adaptador del DOM, el único que toca la página. Escribe todo con `textContent`, nunca con `innerHTML`.
5. **Una sola fuente de configuración.** Las opciones elegidas se traducen a `RedactorOptions` con una función, y esa misma función alimenta al redactor de la isla y al código que se muestra. Un test ejecuta el código generado contra el paquete y exige la misma salida que el ring. El código generado se arma solo con las opciones, nunca con la entrada.
6. **Estrategias del diseño:** Máscara completa es `redact`, Media máscara es `partial` e Incógnito es `hmac`.
7. **Llave de demostración.**
   - Incógnito usa una llave pública fija de más de 32 bytes, cuyo nombre y valor dicen que es de demostración.
   - El ring no tiene campo para llaves, así que nadie puede pegar la suya.
   - Al elegir Incógnito aparece un aviso de que la llave es pública y no sirve para producción.
   - El código generado nunca la incluye: lee la llave de `process.env.ENMASCARA_HMAC_KEY`.
8. **Al menos un tipo.** `createRedactor` rechaza `detect` vacío. El tipo de las opciones exige al menos un elemento y el selector no deja desmarcar el último tipo.
9. **Filas de hallazgos.** Cada fila tiene tipo, línea y resultado:
   - La línea se cuenta en el texto original con `\n`, `\r\n` y `\r` como saltos, a partir de `start`, que ya está en posiciones del texto original (ADR 0004).
   - El resultado es lo que el redactor escribe para ese tramo, con las etiquetas reales del paquete (`[CARD]`, `************1111`). El valor detectado nunca aparece en la tabla.
10. **Falla cerrada.** Si el redactor lanza, la salida es `[REDACTED]`, la tabla queda vacía y el mensaje no incluye la entrada.
11. **Ejemplos con valores de los fixtures.** Log de transferencias, payload JSON y export CSV se escriben con valores de `spec/fixtures/*.yaml`. Un test falla si un identificador de un ejemplo no está en la lista `valid` de su fixture.
12. **Sin red, sin persistencia y sin URL.** La isla no usa `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, almacenamiento, cookies ni `history`. El estado vive en la memoria de la página: recargar la deja vacía. El botón de copiar usa `navigator.clipboard.writeText`, que no sale del navegador.

## Consecuencias

- El bundle de la isla incluye el núcleo con sus catálogos. Su tamaño se mide en el PR y se registra abajo; Lighthouse en `/ring` vigila que el rendimiento no baje de 95.
- Las filas "Ignorado" del diseño no aparecen. Si algún día existe una API de candidatos rechazados, el ring la toma sin cambiar su arquitectura.

### Lo que se midió al construirlo

Pendiente hasta el PR: tamaño del bundle de la isla (sin comprimir y con gzip) y Lighthouse de `/ring` a 390 y 1440 px.

## Seguridad

| Amenaza | Blindaje | Test |
| --- | --- | --- |
| Exfiltración desde el ring | Sin APIs de red ni almacenamiento; CSP `default-src 'self'` | Playwright: escribir, pegar, cambiar opciones y copiar no genera peticiones ni escribe en storage, cookies o IndexedDB; funciona sin conexión después de cargar |
| La entrada termina en la URL | El ring no toca `location` ni `history` | Playwright: `location.href` no cambia después de usarlo |
| XSS desde la entrada | Salida y tabla con `textContent` | Playwright con cargas XSS conocidas: no se crea ningún nodo ni se ejecuta nada |
| La tabla revela el valor | Filas con tipo, línea y resultado enmascarado | Playwright pega cada fixture válido y busca el valor en el DOM fuera de la entrada |
| El panel de código copia la entrada | El fragmento se arma solo con las opciones | Test con una entrada con identificador: el fragmento no la contiene |
| Llave de demostración tomada por real, o llave real pegada | Sin campo de llave; aviso con Incógnito; el código generado lee la llave del entorno | Tests de que no hay campo de llave, de que el aviso aparece y de que el fragmento no contiene la llave |
| Lógica de detección copiada | El ring solo importa `enmascara` | Test estático sobre `apps/site/src/ring` |
