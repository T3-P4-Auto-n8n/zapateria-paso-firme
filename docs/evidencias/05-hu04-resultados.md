# HU-04 · Resultados verificables de preparación

Fecha de preparación: 27/10/2026. **No es una prueba de extremo a extremo en n8n.**

## Verificación ejecutada

- `node --test tests/test_hu04.cjs`: 8/8 superadas; primero se observaron fallar las pruebas de cálculo y de export antes de implementar.
- GET reales a `/api/ventas` y `/api/abonos` con desde=hasta. No se hicieron POST ni cambios en los datos de la app. Snapshots mínimos: [26 de octubre](../../tests/payloads/hu04/api-2026-10-26.json), [día vacío](../../tests/payloads/hu04/api-sin-movimientos.json).
- El Code exacto del JSON exportado se ejecutó con esos snapshots y se comparó con una suma independiente de Python Decimal: [resultados](05-hu04-calculos.json).
- [n8n-mcp validate_workflow](05-hu04-validacion.json): válido, **0 errores y 2 avisos**. Ambos avisos son `executeOnce` en los GET: intencional para evitar repetir la lectura de abonos una vez por venta. 8 nodos, 7 conexiones válidas, 23 expresiones comprobadas. Las sugerencias genéricas de manejo de errores no sustituyen el 08.

## 26/10/2026 · GET de la tienda

| Cifra | Efectivo | Tarjeta | Bizum | Total | Nº |
|---|---:|---:|---:|---:|---:|
| Ventas directas | 14.90 | 98.85 | 79.90 | 193.65 | 4 |
| Abonos | 0.00 | 20.00 | 0.00 | 20.00 | 1 |
| Total | 14.90 | 118.85 | 79.90 | **213.65** | 5 |

[HTML generado por el Code](05-hu04-api.html). Importes coincidentes con GET y Decimal, sin alterar la tienda.

## 01/01/1900 · Día sin movimientos

GET devolvió ambas listas vacías. El Code produce una fila con ceros, cero operaciones y `sin_movimientos: true`, con el mensaje explícito. [HTML](05-hu04-sin-movimientos.html).

## Fixture mixto

Caso independiente con los tres métodos y abonos: ventas 60.60 €, abonos 8.40 €, total **69.00 €**, seis operaciones. [HTML](05-hu04-mixto.html).

## Importación real en n8n

La CLI devolvió `Successfully imported 1 workflow.` para el export completo de ocho nodos. [Workflow local](http://localhost:5678/workflow/HU04CierreDiario1), inactivo. Se asignó la referencia Mailpit existente; no se modificaron los workflows HU-03. La importación no acredita ejecución ni valida las credenciales pendientes.

## Histórico y límites reales

Se creó [Paso Firme · Cierres diarios HU-04](https://docs.google.com/spreadsheets/d/1p4W_chB_73vzmRUOhIY0sZCJM_S1LjM-V9opyAjcj4c/edit). Readback de metadata y `Cierres!A1:Q2` confirmó la pestaña, los 17 encabezados y ausencia de cierres de prueba; se fijó es_ES/Europe/Madrid.

## Ejecuciones reales aisladas de n8n y Mailpit

La prueba del flujo completo se detuvo por la credencial Google Sheets ausente. Para verificar las otras integraciones sin fingir que se guardó el histórico, se creó **otro** workflow inactivo, `HU-04 · Prueba aislada sin histórico`, sin nodo Sheets ni disparador programado. Todos sus correos llevan el prefijo `[PRUEBA SIN HISTÓRICO]` y explican que no se guardó Sheets. El flujo completo no se modificó para saltarse esa dependencia.

- [Ejecución 26](http://localhost:5678/workflow/HU04SmokeTest01/executions/26): 26/10/2026, **Succeeded**, 422 ms; GET ventas y abonos, cálculo 213.65 € y SMTP superados. Mailpit ID `6Nr8Uhf3OucB2IFbIdYK2z`.
- [Ejecución 27](http://localhost:5678/workflow/HU04SmokeTest01/executions/27): 01/01/1900, **Succeeded**, 317 ms; ambas listas vacías, cierre 0.00 €, mensaje «No hubo movimientos el 1900-01-01» y SMTP superados. Mailpit ID `0960QdSUmFF51ORlZhfcut`.
- [Registro de ejecuciones](05-hu04-n8n-smoke.json) y [readback de los dos mensajes reales de Mailpit](05-hu04-mailpit-smoke.json), sin copiar otros mensajes.

La credencial temporal de HU39 falló como inválida en la primera prueba. Se creó una credencial dedicada `API Tienda HU04` con la clave local vigente a través de stdin, sin mostrarla ni guardar un archivo de claves. Se importaron 08 y 10 desde dev, inactivos, con la referencia SMTP local.

**Pendiente real:** conectar Google Sheets OAuth en n8n, ejecutar el flujo completo con movimientos/sin movimientos y repetición de fecha, comprobar fila/actualización en Sheets y envío posterior. También falta la revisión humana en PR antes de publicar, la entrega nocturna y el aviso de errores en producción. No se ha publicado ningún flujo ni se han modificado datos de la app. Las pruebas aisladas no acreditan esas partes.
