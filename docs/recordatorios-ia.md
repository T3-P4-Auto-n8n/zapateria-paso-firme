# Recordatorios redactados con IA · #121–#123

## Objetivo y alcance

Añadir un tono cercano al recordatorio de HU-06 sin delegar datos o decisiones al modelo. La IA redacta **solo introducción y despedida genéricas**; el cuerpo financiero permanece íntegro, construido por el flujo con los valores de la API. No se envían nombre, correo, producto, importe, talla, teléfono, ID ni fechas a Groq. Se conserva el asunto y el destinatario originales.

La variante elegida evita pedir al modelo que copie cifras. No es una redacción completa libre del mensaje: el detalle y las instrucciones de pago siguen siendo deterministas. No cambia la rama de vencimientos HU-07, la rama de clientes sin email ni la tabla `recordatorios enviados`.

## Flujo y configuración

Tras la salida true de `¿Tiene email para el recordatorio?` se añaden:

1. `Preparar redacción del recordatorio`: Code, Run Once for Each Item; conserva el recordatorio y añade instrucciones genéricas `prompt_ia`.
2. `Redactar con Groq`: HTTP POST, credencial `Groq`, modelo `openai/gpt-oss-20b`, JSON Object, temperatura 0, razonamiento low, máximo 1024 tokens, timeout 20 s. Sin reintentos; Never Error y On Error → Continue Regular Output permiten usar la plantilla si falla el proveedor.
3. `Validar redacción del recordatorio`: Code, Run Once for Each Item; recupera su item emparejado del primer Code. Acepta solo JSON con dos strings, longitud 10–180, caracteres de texto permitidos y sin cifras, marcadores, enlaces ni vocabulario numérico/financiero/temporal español reconocido. Caso inválido → texto original. Caso válido → introducción + **texto original intacto** + despedida.

Luego continúa `Enviar recordatorio al cliente` → `Registrar recordatorio enviado`, como antes. La rama sin email va directamente al aviso de tienda. Los 17 nodos anteriores conservan sus parámetros, IDs y nombres; solo cambia la conexión true del IF indicado. Total: 20 nodos, export inactivo, Error workflow 08 conservado.

La comprobación léxica es conservadora y no prueba toda la semántica posible del lenguaje natural. La garantía estructural es que el modelo no recibe datos del apartado ni puede sustituir el bloque original, asunto, destinatario o campos de negocio. Si se necesita controlar toda afirmación posible, usar exclusivamente la plantilla determinista.

Generación idempotente: `python3 scripts/generar_recordatorios_ia.py` actualiza solo estos tres nodos y su conexión. Los Code fuente están en `scripts/hu06/`.

## Pruebas reales · 28/10/2026

Se importó una prueba **aislada**, inactiva, con los mismos tres nodos y dos recordatorios ficticios; sin API de tienda, expiraciones, abonos ni escrituras de Data table. [Fixture reproducible](../tests/payloads/recordatorios-ia-smoke.json). Ejecutada mediante CLI n8n, ID de ejecución **70**, estado Succeeded, **1,987 s**. [Captura de ejecución](evidencias/121-ejecucion.png), [comprobación de cifras](evidencias/121-cifras-verificadas.png), [resultados JSON](evidencias/121-resultados.json).

| Caso sintético | Datos originales | Resultado |
|---|---|---|
| Nora Prueba | 7 días, pendiente 40.00 €, límite 04/11/2026, apartado 25, talla 39 | IA aceptada; texto financiero íntegro, destinatario/asunto iguales; correo entregado en Mailpit |
| Lola Prueba | 1 día, pendiente 12.50 €, límite 29/10/2026, apartado 26, talla 38 | IA aceptada; texto financiero íntegro, destinatario/asunto iguales; correo entregado en Mailpit |

Emails abiertos: [Nora](evidencias/121-nora-mailpit.png) (`48ZppoYyOwrrU0gWrdounz`) y [Lola](evidencias/121-lola-mailpit.png) (`2GQwwwxCngGCXuHwvyi5Kw`). El SMTP de la prueba añade su pie automático n8n; el envío del flujo 06 sigue usando el sub-workflow 10 existente.

La prueba verifica dos items distintos en la misma ejecución y compara texto, pendiente, fecha y destinatario con el fixture antes del envío. Los IDs 25/26 son datos sintéticos de la prueba, no registros creados en la tienda. No fue necesario restaurar DB ni limpiar la tabla: no se modificaron.

Pruebas locales: `node --test tests/test_recordatorios_ia.cjs` — 5/5. Casos adversos: importe alterado, números escritos, fecha/plazo, HTML, URL, controles, HTTP 429, error de transporte simulado, JSON inválido y claves extra → plantilla original. Los errores de proveedor se simularon localmente; no se presentan como fallos reales de Groq.

n8n-mcp: válido, 0 errores, 1 aviso intencional del `Execute Once` existente en `Leer recordatorios enviados`. [Validación](evidencias/121-validacion.json).

## Criterios y límites

- [x] Nodo IA en flujo 06 que redacta texto cercano: introducción/despedida, datos privados y financieros fuera del modelo.
- [x] Prueba real con IA demuestra que las cifras originales no cambian, con dos recordatorios y emails capturados.
- [x] Salida inválida/fallo del proveedor conserva el recordatorio original (pruebas locales).
- [x] Export JSON único de 06, documentación, evidencias y PR a dev.
- [ ] Revisión humana y prueba de la rama completa con Data table y sub-workflow en esta versión antes de publicar.

No se ejecutó de nuevo la rama completa de vencimientos ni la programación diaria. Las evidencias previas de HU-06 acreditan sus pruebas originales; esta tarea prueba aisladamente el añadido de estilo. El flujo 06 sigue sin publicar.
