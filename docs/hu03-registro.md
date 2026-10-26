# HU-03 · Registro del abono (#37)

## Alcance

Solo la salida `registrar` aprobada por #36 puede llegar al `POST /api/apartados/{id}/abonos`. Antes de enviar, el flujo vuelve a comprobar el ID, estado activo, fecha límite e importe frente al `pendiente` devuelto por la API. El cuerpo incluye únicamente `importe` y `forma_pago: "bizum"`; así se registran tanto Bizum como transferencias, según la decisión del proyecto.

El nodo HTTP usa la credencial Header Auth `API Tienda`, timeout de 30 segundos, `On Error → Continue` y sin reintentos automáticos. La respuesta completa conserva el código HTTP. `201` es éxito y la app dispara el webhook de HU-02 para enviar el recibo; este flujo no manda un recibo duplicado. `422` va a revisión (#38) con el `detail` de la API; `404` también requiere revisión. `401`, `5xx` y errores de transporte lanzan error técnico al workflow 08. Ante timeout no se repite el POST a ciegas: hay que conciliar el abono antes de volver a ejecutarlo.

## Seguridad y prueba local

Importar `workflows/03-abonos-distancia-registro.json`, asignar `Groq` y `API Tienda`, y seleccionar el `08 · Error Workflow` local en **Settings**. Mantener IMAP deshabilitado y el workflow inactivo. La suite local simula respuestas `201`, `422`, `404`, `401`, `5xx` y error de red; no llama a la tienda ni modifica su base de datos. **No ejecutar el POST con un apartado real durante la prueba de importación.**

## Verificación

`tests/test_hu03_registro.cjs` cubre el guard de autorización, importe/ID/estado/plazo, endpoint, autenticación, cuerpo mínimo, respuestas y ausencia de retry/correo. La importación y prueba de configuración en n8n siguen pendientes; el primer POST real requiere una base de datos desechable y restaurable, fuera de esta etapa.
