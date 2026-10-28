# HU-04 · Resultados verificables

Preparación: 27/10/2026. Pruebas completas con Sheets y Mailpit: 28/10/2026.

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

## Pruebas completas · 28/10/2026

OAuth conectado por la pareja. Se corrigió la referencia vacía del nodo Sheets para usar la credencial local conectada; no se guardaron secretos.

| Caso | Ejecución real | Resultado |
|---|---|---|
| 2026-10-26 | [32](http://localhost:5678/workflow/HU04CierreDiario1/executions/32), 3.603 s | Succeeded; histórico y correo 213.65 €, 5 operaciones. |
| 1900-01-01 | [37](http://localhost:5678/workflow/HU04CierreDiario1/executions/37), 3.219 s | Succeeded; histórico con ceros, correo «No hubo movimientos». |
| Repetir 2026-10-26 | [38](http://localhost:5678/workflow/HU04CierreDiario1/executions/38), 7.661 s | Succeeded; una sola fila para esa fecha después de repetir. |

GET actuales confirmaron de nuevo 213.65 € y cero para el día vacío. [Readback de Sheets antes/después](05-hu04-sheets-readback.json): dos filas de datos, una por fecha, mismas cifras. El correo de la repetición puede reenviarse según la spec.

### Capturas guardadas

- [Ejecución con movimientos](05-hu04-con-movimientos-n8n.jpg).
- [Correo con movimientos](05-hu04-con-movimientos-mailpit.jpg), Mailpit `4c2qab2tABubnRW5GmeeW6`.
- [Histórico de Sheets](05-hu04-historico-sheets.jpg).
- [Ejecución sin movimientos](05-hu04-sin-movimientos-n8n.jpg).
- [Correo sin movimientos](05-hu04-sin-movimientos-mailpit.jpg), Mailpit `4QhkCwUpF9ELzYe4zCscn3`.
- [Repetición de fecha](05-hu04-repeticion-n8n.jpg).

### Pendiente de producción

El flujo 05 sigue sin publicar. AGENTS.md prohíbe al agente activar/publicar y exige revisión humana en PR. Por ello siguen pendientes la entrega automática real a las 00:05 y una prueba del aviso de error del 08 desde una ejecución de producción. Una ejecución manual exitosa no acredita esas dos pruebas. La regla de fecha programada sí está cubierta por la suite (Madrid, cambio de año y horario de verano). No se modificaron datos de la app durante estas pruebas HU-04.
