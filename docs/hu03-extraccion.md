# HU-03 · Extracción estructurada (#34)

## Workflow integrado

La extracción está integrada en `workflows/03-abonos-distancia.json`; no importar un export parcial. El workflow permanece inactivo, IMAP deshabilitado y debe probarse solo con la API desechable. Al importar, seleccionar las credenciales locales `Groq`, `API Tienda`, `Mailpit` y `08 · Error Workflow`.

El filtro #33 descarta anuncios antes de Groq. Para pagos reconocidos, la IA extrae exclusivamente `ordenante`, `importe` y `concepto`. `Validar extracción` exige esos campos y los compara con los datos textuales del correo antes de continuar a la consulta de tienda. El modelo no busca apartados ni decide o registra abonos.

```json
{"ordenante":"CARMEN RUIZ GARCIA","importe":10,"concepto":"zuecos"}
```

El nodo usa `openai/gpt-oss-20b`, temperatura 0 y JSON Object Mode. Un JSON sintácticamente correcto no garantiza el contrato: los datos ausentes, negativos, inventados, incompletos o con claves adicionales se envían a revisión. Groq recibe solo las etiquetas bancarias imprescindibles, sin cabeceras, cuentas ni datos de candidatos.

## Pruebas y límites

`node --test tests/test_hu03_extraccion.cjs` ejecuta el código incluido en el workflow integrado. Cubre ocho pagos de ejemplo, publicidad, concepto vacío, esquema inválido, datos inventados, importe negativo, JSON truncado y error del proveedor. Las capturas antiguas de Carmen y Silvia acreditan pruebas de extracción anteriores, no una ejecución completa del workflow consolidado.

Los nueve casos E2E en n8n, las capturas nuevas, la confirmación del correo en Mailpit y la conciliación en una API desechable siguen pendientes. No usar la base de datos habitual ni publicar el workflow para hacer esas pruebas.
