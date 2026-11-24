# Herramientas de publicación

Paquete privado del workspace. Calcula y ejecuta el release de los paquetes de `packages/`. Las decisiones están en el [ADR 0009](../../docs/decisions/0009-publicacion-de-las-integraciones.md).

| Comando | Qué hace |
| --- | --- |
| `node tools/release/scripts/release.ts plan` | Muestra qué se publica, qué solo se etiqueta y qué se omite. Falla si un paquete por publicar no está reservado en npm |
| `node tools/release/scripts/release.ts publish` | Publica con `npm publish`, exige la atestación SLSA y crea la etiqueta `<paquete>@<versión>`, paquete por paquete. Solo corre en `release.yml` |
| `pnpm examples:packed` | Empaqueta los paquetes, instala cada ejemplo desde esos tarballs fuera del workspace y corre sus tests |
