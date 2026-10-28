# HU-04 · Configuración y prueba

Documento principal: [spec](../specs/05-cierre-diario.md). La versión anterior se probó con Sheets y Mailpit (ejecuciones 32, 37 y 38). Esa evidencia es histórica; la escritura actual a Data Table Cierres se verificó en ejecuciones completas 76/77/78, con día vacío y upsert sin duplicados. [Resultados y capturas](evidencias/05-hu04-resultados.md). El flujo sigue inactivo; publicación pendiente de revisión humana.

## Importar y configurar

1. Ya importado en esta instancia como `05 · Cierre diario` (ID `HU04CierreDiario1`). En otra instancia, importar `workflows/05-cierre-diario.json`. La referencia Mailpit local está asignada y los GET usan `API Tienda`.
2. En `Leer ventas del día` y `Leer abonos del día`, elegir **API Tienda** (Header Auth, X-API-Key). La credencial local se llama API Tienda; los GET de las ejecuciones actuales 76/77/78 funcionan con ella. No necesita Google OAuth. No incluir valores en el repo.
3. En Overview → Data tables, crea una tabla llamada **Cierres** con las 17 columnas de la spec: `fecha` como String; todas las columnas de importes y operaciones como Number; `sin_movimientos` como Boolean. No necesita credencial externa. El nodo usa el nombre de tabla, no un ID de otra instancia.
4. `Guardar cierre en Cierres` usa Row → Upsert, condición `fecha` igual a la fecha del informe, y mapea explícitamente las 17 columnas de `fila`. En la primera ejecución crea una fila; al repetir secuencialmente la misma fecha, la actualiza.
5. En `Enviar cierre diario`, elegir **Mailpit**; host mailpit, puerto 1025, sin TLS ni usuario/contraseña. Destinatario de prueba tienda@pasofirme.example. Subject/HTML vienen de **Preparar cierre**.
6. Settings → Timezone **Europe/Madrid**; Error workflow **08 · Error Workflow**. El aviso de errores de producción debe comprobarse en esta instancia. No crear referencias a IDs inexistentes; elegir el 08 local real.
7. Guardar sin publicar. La publicación queda a la revisión humana de la pareja, según AGENTS.md.

## Pruebas reales en n8n

- Comprobar datos de la tienda con GET/Swagger, nunca POST. Usar 2026-10-26 (snapshot en las evidencias) y 1900-01-01 (día vacío). Si cambian los datos, comparar con los datos actuales, no forzar cifras antiguas.
- Execute workflow → formulario **Elegir día** → `fecha` elegida. Para cada fecha, volver a Execute workflow y abrir la pestaña nueva.
- La ruta completa tiene que llegar a **Guardar cierre en Cierres** y después a **Enviar cierre diario**, con todos los nodos correctos.
- Comparar ventas/abonos por método y total con GET de esa misma fecha. Hay que incluir abonos iniciales; no sumar los precios de los apartados ni abonos dos veces.
- Verificar la fila en la Data table `Cierres` y el correo en Mailpit. Para el día vacío deben guardarse ceros y llegar «No hubo movimientos el 1900-01-01».
- Repetir secuencialmente una fecha: debe seguir habiendo una fila para ese día (el correo se reenvía). No ejecutar simultáneamente el mismo cierre.
- Las capturas ya existentes muestran la versión anterior con Sheets; generar evidencia nueva de la Data table antes de afirmar que la integración actual se probó. Anotar ID/enlace de ejecución y resultado real. No guardar claves en capturas.
- Con el flujo publicado por la pareja, verificar una entrega programada a las 00:05 (cierra ayer) y la configuración del 08. No marcar esa prueba por haber pulsado Execute step en el trigger.

## Comprobaciones reproducibles sin n8n

```sh
node --test tests/test_hu04.cjs
python3 scripts/generar_hu04.py
python3 scripts/verificar_hu04.py --fecha 2026-10-26 --env-file /ruta/al/repo/.env --out /tmp/hu04-api.json
```

El verificador solo hace GET, no muestra la clave y guarda únicamente id/fecha/importe/forma_pago (sin datos personales). La referencia independiente usa Decimal; los Code suman céntimos. El generador usa solo Python estándar y no importa ni publica nada. Validar con n8n-mcp después de modificar el export.

## Cobertura de issues

| Issue | Entrega / estado |
|---|---|
| #42 Spec | Escrita siguiendo la plantilla. |
| #43 Construcción y ai-log | Export de 8 nodos, dos Code revisables, generador y bitácora. |
| #44 Pruebas | Pruebas locales, GET reales y dos ejecuciones n8n aisladas con Mailpit superadas; ejecución completa con Sheets superada históricamente (32, 37, 38). Actual: Data Table probada completa en 76/77/78. |
| #45 Export/PR | JSON, código y evidencias en [PR #173](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/pull/173), abierta para revisión a dev desde feature/hu04-cierre-diario. |
| #46 Evidencia | JSON de cálculos, snapshots GET, HTML, validación, ejecuciones n8n 26/27 y mensajes Mailpit reales; cinco capturas obligatorias y captura adicional de repetición guardadas. |
| #47 Histórico | Anteriormente verificado con Google Sheets. Sustituido por la Data table local `Cierres`; escritura/upsert verificada en 76/77/78, una fila por fecha. |
| #48 Día vacío | Ejecución aislada n8n 27 superada; Mailpit recibió el correo de cero con el mensaje explícito. Caso completo con Sheets superado históricamente en ejecución 37; día vacío Data Table verificado en 77. |

Las pruebas manuales actuales de Data Table ya tienen evidencia; #41 sigue pendiente de entrega programada/publicación tras revisión humana. `Cierres` conserva el resumen de n8n; no reemplaza la base de datos de la tienda.
