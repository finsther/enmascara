# Política de seguridad

Enmascara existe para que ningún dato sensible quede expuesto, así que tratamos como vulnerabilidad cualquier cosa que lo permita.

## Versiones soportadas

Mientras Enmascara esté en versiones `0.x`, solo la última versión publicada recibe correcciones de seguridad.

## Cómo reportar una vulnerabilidad

Repórtala en privado desde [GitHub Security Advisories](https://github.com/finsther/enmascara/security/advisories/new). No abras un issue público.

Incluye:

- La versión de `enmascara` y el entorno (Node.js o navegador).
- Una entrada mínima que reproduzca el problema y el resultado esperado.
- El impacto que observas.

**No incluyas datos reales** (CURP, RFC, CLABE ni tarjetas de personas). Usa los valores sintéticos de `spec/fixtures/` o genera los tuyos.

## Qué consideramos vulnerabilidad

- Un identificador válido que no se enmascara (falso negativo), sobre todo si se evade con Unicode, separadores o mayúsculas y minúsculas.
- Entradas que bloquean el proceso por tiempo o memoria (ReDoS, entradas gigantes, objetos profundos o circulares).
- Contaminación de prototipo o ejecución de getters al recorrer objetos.
- Mensajes de error que incluyen el valor detectado o la llave HMAC.
- Cualquier acceso a red o dependencia de runtime en el paquete `enmascara`.

## Qué esperar

- Acuse de recibo en un máximo de 3 días hábiles.
- Evaluación inicial y severidad en un máximo de 10 días hábiles.
- Una corrección publicada con su aviso de seguridad. Te daremos crédito si así lo quieres.
