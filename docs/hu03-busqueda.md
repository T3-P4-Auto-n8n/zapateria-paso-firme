# HU-03 · Búsqueda del apartado (#35)

## Alcance

Esta etapa toma `url_busqueda` de la validación de #34 y ejecuta un GET autenticado contra la API. El código anterior ya eligió la ruta por ID explícito o una consulta conservadora `estado=activo&q=...`. El resultado se entrega a `Resultados de búsqueda (#36)` para la decisión de candidatos.

No sustituye un ID explícito si la API responde 404. No compara candidatos, decide si se registra un abono ni envía mensajes: eso corresponde a #36–#38. La exportación permanece inactiva; el HTTP Request es de solo lectura.

## Configuración

Al importar `workflows/03-abonos-distancia-busqueda.json` en n8n, asignar las credenciales existentes `Groq` y `API Tienda` al workflow. En **Settings → Error Workflow**, seleccionar el `08 · Error Workflow` local. Mantener IMAP deshabilitado y el workflow sin publicar.

Todas las solicitudes usan `X-API-Key` mediante Header Auth. Un 404 se entrega con el código de estado para la revisión de #36; un fallo de red detiene la ejecución para que actúe el workflow 08. No contiene llamadas POST a la tienda ni envíos de correo.

## Verificación

`tests/test_hu03_busqueda.cjs` comprueba el método y URL, credencial, respuesta completa, conexión hacia #36 y ausencia de escrituras/SMTP. La importación y validación en n8n, incluida la prueba de 404 y de credenciales, siguen pendientes; no publicar esta exportación.
