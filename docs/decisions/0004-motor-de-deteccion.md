# ADR 0004: Motor de detección

- **Estado:** aceptado
- **Fecha:** 2026-10-30
- **Historia:** Sprint 1, historia 5

## Contexto

El motor convierte texto u objetos en su versión enmascarada. El plan del sprint lo describe como una regex combinada, validación por candidato, confianza y enmascarado. El modelo de amenazas le asigna la evasión por Unicode, las entradas gigantes, la contaminación de prototipo, los getters, los ciclos, la profundidad, la fuga por errores y la mutación del original.

## Decisiones

1. **Una regex por tipo, no una combinada.**
   - Con alternancias en una sola regex, el motor se queda con la primera alternativa que coincide. Si ese candidato no pasa la validación, el de otro tipo en la misma posición nunca se prueba. Por ejemplo, en `4242 4242 4242 4242 12` un candidato de CLABE inválido escondería la tarjeta.
   - Cada patrón se compila una sola vez al crear el redactor.
   - Después de un candidato rechazado, la búsqueda sigue en la posición siguiente.
2. **Normalización con mapa de posiciones.** La detección corre sobre una copia del texto:
   - NFKC carácter por carácter.
   - Mayúsculas, así se detectan CURP y RFC en minúsculas.
   - Sin caracteres `Default_Ignorable_Code_Point` (espacio de ancho cero, guion suave, BOM, controles bidi).

   Cada unidad de esa copia recuerda su posición en el original. Así se enmascara el tramo original completo, invisibles incluidos, y `findings()` reporta posiciones del texto que recibió el usuario, en unidades UTF-16.
3. **CLABE con separadores.** El patrón de la spec acepta un espacio o un guion entre dígitos: `(?<![0-9])[0-9](?:[ -]?[0-9]){17}(?![0-9])`.
4. **Falla cerrada:**
   - Si un validador lanza una excepción, el candidato se enmascara.
   - Si leer un objeto lanza una excepción, por ejemplo un Proxy, ese objeto se reemplaza por `[REDACTED]`.
5. **Límites:**
   - Se inspeccionan `maxInputLength` caracteres (1 000 000 por omisión) y el resto se reemplaza por `[REDACTED]`.
   - La detección mira 256 caracteres más allá del límite: un identificador que empieza antes del corte se enmascara completo.
   - Un texto con menos de 6 dígitos (`\p{Nd}`) se devuelve sin detectar.
6. **`object()`:**
   - Copia iterativa, con una pila de tareas, así que la profundidad no depende de la pila de llamadas.
   - Las copias de objetos no tienen prototipo y solo llevan propiedades propias de datos. Los accesores se omiten sin ejecutarse y las funciones se descartan.
   - Se enmascaran también las claves, y los números y bigint que contienen un identificador. Un `Error` se copia como `name`, `message`, `stack` y sus propiedades propias.
   - En Node 22 y 24, `stack` es un accesor propio de cada error. La copia lo lee solo si su getter es el del motor de JavaScript, comparado por identidad con el de un `Error` de prueba; un getter de `stack` definido por la aplicación se omite sin ejecutarse.
   - Un objeto que vuelve a un ancestro se reemplaza por `[Circular]`; uno compartido por dos ramas se copia dos veces.
   - Lo que pasa de `maxDepth` (32 por omisión) se reemplaza por `[MaxDepth]`.
7. **Errores sin valores.** Los mensajes de `InvalidConfigurationError` nombran la opción y nunca repiten lo que recibieron. `text()`, `findings()` y `object()` no lanzan con ninguna entrada; fast-check lo comprueba con texto Unicode y valores JSON arbitrarios.

## Consecuencias

- Hay cuatro pasadas por texto en lugar de una. La meta de rendimiento se medirá en la historia 9.
- Si dos claves de un objeto se enmascaran igual, por ejemplo dos CURP como claves, la segunda sobrescribe a la primera en la copia.
- Leer `stack` ejecuta `Error.prepareStackTrace` si la aplicación lo definió, igual que cualquier acceso a `err.stack`. Si lanza, el error completo pasa a `[REDACTED]`.
- `Date`, `Map` y `Set` se copian como objetos con solo sus propiedades propias de datos, así que quedan vacíos. Tratarlos de forma especial queda para otra historia.
- La normalización carácter por carácter no recompone secuencias de varios caracteres, como una letra seguida de un acento combinante. No afecta a los identificadores del MVP, que son ASCII después de NFKC.
