# HU-04 · Configuración y prueba

Documento principal: [spec del cierre diario](../specs/05-cierre-diario.md). El JSON está completo e importado en [n8n local](http://localhost:5678/workflow/HU04CierreDiario1), **inactivo**. No se ha publicado ni ejecutado de extremo a extremo: falta la conexión OAuth de Google Sheets; API y dependencias locales ya están configuradas/importadas.

## Importar y configurar

1. Ya importado en esta instancia como `05 · Cierre diario` (ID `HU04CierreDiario1`). En otra instancia, importar `workflows/05-cierre-diario.json`. La referencia Mailpit local está asignada y los GET usan `API Tienda HU04`; falta Google Sheets OAuth.
2. En `Leer ventas del día` y `Leer abonos del día`, elegir **API Tienda** (Header Auth, X-API-Key). En esta instancia se creó `API Tienda HU04` con la clave local vigente, sin imprimirla ni escribirla en un archivo de credenciales; los GET se probaron con éxito en la prueba aislada. La credencial temporal anterior dio error y no se reutilizó. No incluir valores en el repo.
3. En `Guardar cierre en Sheets`, elegir una credencial **Google Sheets OAuth2** con permiso de edición en el documento. Esta credencial **no existe todavía en el n8n local**. La conexión OAuth debe hacerla la pareja; el agente no crea ni inventa tokens.
4. El [histórico creado y verificado](https://docs.google.com/spreadsheets/d/1p4W_chB_73vzmRUOhIY0sZCJM_S1LjM-V9opyAjcj4c/edit) ya tiene la pestaña `Cierres` y sus 17 encabezados exactos. Locale es_ES y zona Europe/Madrid. No contiene cierres ficticios. En otra cuenta/instancia se puede usar un documento propio con los mismos encabezados y seleccionar su ID.
5. Google Sheets → Operation **Append or Update Row**, matching column **fecha**, pestaña **Cierres**, mapeo explícito de las 17 columnas. El export ya lo incluye. Si la UI pide refrescar columnas, volver a elegir la pestaña y conservar `fecha` como matching column. RAW evita interpretar valores como fórmulas.
6. En `Enviar cierre diario`, elegir **Mailpit**; host mailpit, puerto 1025, sin TLS ni usuario/contraseña. Destinatario de prueba tienda@pasofirme.example. Subject/HTML vienen de **Preparar cierre**, porque Sheets devuelve una fila y no el informe.
7. Settings → Timezone **Europe/Madrid**; Error workflow **08 · Error Workflow**. Se importaron desde `dev` el 08 y su sub-workflow `10 · Enviar notificación`, con la referencia Mailpit local; ambos siguen inactivos. El export HU-04 referencia el ID del 08 importado. Su aviso de errores de producción sigue pendiente de comprobar. No crear referencias a IDs inexistentes; elegir el 08 local real.
8. Guardar sin publicar. La publicación queda a la revisión humana de la pareja, según AGENTS.md.

## Prueba real pendiente en n8n

- Comprobar datos de la tienda con GET/Swagger, nunca POST. Usar 2026-10-26 (snapshot en las evidencias) y 1900-01-01 (día vacío). Si cambian los datos, comparar con los datos actuales, no forzar cifras antiguas.
- Execute workflow → formulario **Elegir día** → `fecha` elegida. Para cada fecha, volver a Execute workflow y abrir la pestaña nueva.
- La ruta completa tiene que llegar a **Guardar cierre en Sheets** y después a **Enviar cierre diario**, con todos los nodos correctos.
- Comparar ventas/abonos por método y total con GET de esa misma fecha. Hay que incluir abonos iniciales; no sumar los precios de los apartados ni abonos dos veces.
- Verificar la fila en `Cierres` y el correo en Mailpit. Para el día vacío deben guardarse ceros y llegar «No hubo movimientos el 1900-01-01».
- Repetir secuencialmente una fecha: debe seguir habiendo una fila para ese día (el correo se reenvía). No ejecutar simultáneamente el mismo cierre.
- Capturas: `docs/evidencias/05-hu04-con-movimientos-n8n.png`, `05-hu04-con-movimientos-mailpit.png`, `05-hu04-historico-sheets.png`, `05-hu04-sin-movimientos-n8n.png`, `05-hu04-sin-movimientos-mailpit.png`. Anotar ID/enlace de ejecución y resultado real. No guardar claves en capturas.
- Con el flujo publicado por la pareja, verificar una entrega programada a las 00:05 (cierra ayer) y la configuración del 08. No marcar esa prueba por haber pulsado Execute step en el trigger.

## Comprobaciones reproducibles sin n8n

```sh
node --test tests/test_hu04.cjs
python3 scripts/generar_hu04.py --spreadsheet-id 1p4W_chB_73vzmRUOhIY0sZCJM_S1LjM-V9opyAjcj4c
python3 scripts/verificar_hu04.py --fecha 2026-10-26 --env-file /ruta/al/repo/.env --out /tmp/hu04-api.json
```

El verificador solo hace GET, no muestra la clave y guarda únicamente id/fecha/importe/forma_pago (sin datos personales). La referencia independiente usa Decimal; los Code suman céntimos. El generador usa solo Python estándar y no importa ni publica nada. Validar con n8n-mcp después de modificar el export.

## Cobertura de issues

| Issue | Entrega / estado |
|---|---|
| #42 Spec | Escrita siguiendo la plantilla. |
| #43 Construcción y ai-log | Export de 8 nodos, dos Code revisables, generador y bitácora. |
| #44 Pruebas | Pruebas locales, GET reales y dos ejecuciones n8n aisladas con Mailpit superadas; falta ejecutar el flujo completo con Sheets. |
| #45 Export/PR | JSON, código y evidencias en [PR #173](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/pull/173), borrador a dev desde feature/hu04-cierre-diario. |
| #46 Evidencia | JSON de cálculos, snapshots GET, HTML, validación, ejecuciones n8n 26/27 y mensajes Mailpit reales; faltan evidencias del flujo completo con Sheets. |
| #47 Histórico Google Sheets | Documento real creado, encabezados verificados, upsert configurado; falta OAuth y probar la escritura desde n8n. |
| #48 Día vacío | Ejecución aislada n8n 27 superada; Mailpit recibió el correo de cero con el mensaje explícito. Falta verificar el caso en el flujo completo con Sheets. |

No cerrar #41 ni las pruebas/evidencias pendientes hasta tener los resultados reales. El histórico de Sheets no reemplaza la base de datos de la tienda.
