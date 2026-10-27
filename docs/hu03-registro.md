# HU-03 · Registro del abono (#37)

## Workflow integrado

El registro está integrado en `workflows/03-abonos-distancia.json`. Solo una decisión `registrar` de #36 llega a **Preparar solicitud de abono (#37)**, que vuelve a validar ID, estado activo, fecha límite e importe frente al pendiente de la API. `Registrar abono` hace POST a `/api/apartados/{id}/abonos` con cuerpo mínimo `{importe, forma_pago: "bizum"}`. Bizum y transferencias se registran como `bizum`, según la decisión del proyecto.

Seleccionar la credencial Header Auth local `API Tienda` y el workflow `08 · Error Workflow` local en Settings. Usar exclusivamente una API/base desechable. Mantener el flujo inactivo, IMAP deshabilitado y sin publicación. Antes de cualquier POST, confirmar que los nodos HTTP no apuntan a los datos habituales de la tienda.

Un `201` deja que el webhook HU-02 envíe su recibo; HU-03 no manda duplicados. Un `422` o `404` va a revisión. 401, 5xx y transporte fallido llegan al workflow 08. No se reintenta automáticamente; tras timeout primero se concilia el estado de la base de prueba.

## Verificación local

`node --test tests/test_hu03_registro.cjs` cubre guardas de autorización, ID, importe, estado, plazo, endpoint, cabecera, cuerpo, respuestas 201/422/404/401/5xx y error de red. No realiza POST ni modifica la base de datos. La comprobación E2E sigue pendiente.
