# HU-03 · Extracción estructurada (#34)

## Alcance y dependencias

Esta etapa continúa la entrada de #32 y el filtro determinista de #33. El workflow parcial `03 · Abonos a distancia (extracción)` termina en `Continuar con búsqueda (#35)` si la extracción es válida o `Revisar extracción (#38)` en otro caso. No busca apartados ni registra abonos; tampoco manda emails. El workflow `01` conserva los avisos y recibos de HU-02.

El JSON queda inactivo e IMAP deshabilitado. Solo contiene una llamada HTTP a Groq. No se incluyen credenciales ni datos de cuenta. La IA solo extrae los tres campos; el Code node valida el esquema y compara los valores con las etiquetas del aviso antes de continuar.

## Contrato de extracción

```json
{"ordenante":"CARMEN RUIZ GARCIA","importe":10,"concepto":"zuecos"}
```

Se requieren exactamente `ordenante` (string), `importe` (número positivo en EUR) y `concepto` (string, que puede estar vacío). La preparación solo acepta las etiquetas únicas `Ordenante`, `Importe` y `Concepto` de los formatos de ejemplo. Envía a Groq solo esos tres valores. No envía cuenta bancaria, cabeceras, email, teléfono ni candidatos de tienda. No se promete compatibilidad con formatos bancarios distintos.

El nodo usa el modelo `openai/gpt-oss-20b`, temperatura 0 y JSON Object Mode mediante la credencial n8n `Groq`. JSON Object Mode garantiza sintaxis JSON, no el contrato; `Validar extracción` sigue siendo obligatorio. Un valor inventado, incompleto, negativo o con esquema adicional va a revisión. Una respuesta fallida de Groq se trata como error técnico para el Error Workflow `08`.

## Prueba local en n8n

1. Importar `workflows/03-abonos-distancia-extraccion.json`, dejarlo sin publicar y asignar la credencial `Groq`.
2. En **Settings → Error Workflow**, seleccionar el `08 · Error Workflow` de la instancia local. El ID exportado puede cambiar al importar.
3. Mantener IMAP deshabilitado. Abrir **Formulario de desarrollo → Test URL** y usar solo los correos ficticios de `data/correos/`. Enviar un correo cada vez.
4. Comprobar la salida de `Preparar correo`, `Extraer datos con Groq`, `Validar extracción` y la ruta final. Publicidad debe terminar en `Ignorar publicidad`; datos de pago pasan a `Continuar con búsqueda (#35)`.

No publicar ni configurar IMAP de producción como parte de esta prueba.

## Verificación local (26/10/2026)

`node --test tests/test_hu03_extraccion.cjs`: 4/4 superadas sobre los Code nodes y las expresiones del JSON exportado. Incluye ocho pagos de ejemplo, publicidad, conceptos vacíos, datos inventados, esquema inválido, importe negativo, JSON truncado y error del proveedor. No llama a Groq ni a la API de tienda.

La exportación se ejecutó en una instancia n8n local, sin publicar. Los ocho mensajes de pago llegaron a la ruta `buscar` con los tres campos esperados; el anuncio terminó en `ignorar` antes de Groq. El concepto vacío se conservó. No se escribió ningún abono. El primer modelo configurado devolvió `model_not_found`; se consultó la lista de modelos desde la instancia y `openai/gpt-oss-20b` respondió correctamente. Las salidas observadas están en `docs/evidencias/03-hu03-extraccion-resultados.json`; se conservan capturas de Carmen y Silvia. Los identificadores de ejecución de los tres últimos ejemplos no están vinculados en el registro, así que no se inventan.

## Pendiente para completar la revisión

- Importación/validación n8n-mcp de la exportación final y comprobación de que el enlace local a `08` dispara ante un error técnico.
- Confirmar los tres identificadores de ejecución que faltan y exportar desde la instancia local.
- Revisar esta entrega en PR antes de considerar #34 cerrado.
- La recepción real por IMAP pertenece a #32; búsqueda, elegibilidad, registro y avisos de revisión pertenecen a #35–#38.
