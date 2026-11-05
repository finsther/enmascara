# ADR 0005: Estrategias de enmascarado

- **Estado:** aceptado
- **Fecha:** 2026-11-05
- **Historia:** Sprint 1, historia 6

## Contexto

Además de `redact`, el plan pide `partial`, con reglas por tipo, y `hmac`, para correlacionar a una misma persona entre errores sin exponerla. El núcleo no tiene dependencias, debe correr también en el navegador, donde vivirá el playground, y `redact.text()` es síncrona. La criptografía nativa del navegador (`crypto.subtle`) solo es asíncrona.

## Decisiones

1. **SHA-256 y HMAC-SHA256 en TypeScript puro** (`packages/core/src/strategies/sha256.ts`), elegidos frente a cargar `node:crypto` en tiempo de ejecución.
   - **Por qué:** funcionan igual en Node y en el navegador, de forma síncrona y sin dependencias.
   - **Verificación:**
     - Los ejemplos de NIST FIPS 180-4, incluido el de un millón de letras `a`.
     - Los casos 1 a 4, 6 y 7 del RFC 4231. El 5 trunca la salida.
     - La comparación con `node:crypto` sobre entradas arbitrarias, con fast-check.

     Todos los vectores se comprobaron antes con `hashlib` y `hmac` de Python.
   - **Alcance:** la implementación solo se usa para generar seudónimos, no para proteger secretos en tránsito.
2. **Valor canónico.** `partial` y `hmac` trabajan sobre el valor con NFKC por carácter, en mayúsculas, sin `Default_Ignorable_Code_Point` y solo con `0-9`, `A-Z`, `Ñ` y `&`. Así, la misma identidad escrita con guiones, espacios, minúsculas o caracteres invisibles da la misma salida.
3. **`partial`.** Deja visibles los últimos `mask.partial.last` caracteres que fija la spec (2 en CURP y RFC, 4 en CLABE y tarjeta) y reemplaza el resto por `*`. El schema de la spec impide que CURP o RFC muestren más de 2, lo que protege la fecha de nacimiento.
4. **`hmac`.** Escribe `[TIPO:hhhhhh]`, con los primeros 6 caracteres hex de HMAC-SHA256 sobre `tipo:valor canónico`. El tipo separa dominios: el mismo texto nunca da la misma etiqueta en dos tipos.
   - Con 24 bits, dos valores distintos coinciden con probabilidad de alrededor de 1 en 16 millones. Basta para correlacionar errores, no para identificar de forma única.
5. **Llave.** La llave se recibe por configuración, como texto (sus bytes UTF-8) o como bytes, y nunca tiene un valor por omisión.
   - Si algún tipo usa `hmac` y falta la llave, o tiene menos de 32 bytes, `createRedactor` lanza `InvalidConfigurationError`. El mensaje nunca repite la llave.
6. **Contrato entre lenguajes.** `spec/fixtures/strategies.yaml` usa una llave de prueba. Las salidas se calcularon con Python, las confirma una referencia con `node:crypto` en `spec/tools` y el núcleo las reproduce con su propio HMAC.

## Consecuencias

- Rotar la llave cambia todas las etiquetas. Los errores registrados antes y después de la rotación no se pueden correlacionar.
- Con una llave débil, la estructura predecible de una CURP permitiría revertir etiquetas por fuerza bruta. Por eso el mínimo de 32 bytes no es configurable.
- Implementar criptografía propia agrega código que mantener. Si en el futuro se acepta una API asíncrona, se puede reemplazar por `crypto.subtle` sin cambiar las etiquetas, porque el algoritmo es el mismo.
