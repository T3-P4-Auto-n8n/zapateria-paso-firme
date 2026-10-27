# HU-03 · Búsqueda del apartado (#35)

## Workflow integrado

La búsqueda forma parte de `workflows/03-abonos-distancia.json`. El node **Buscar apartado** hace un GET autenticado con `API Tienda` usando la URL elegida por la validación, y **Resultados de búsqueda** entrega la respuesta a #36. No importar un JSON parcial.

La consulta usa el API de la tienda configurado para la instancia. En n8n seleccionar la credencial Header Auth local `API Tienda` con cabecera `X-API-Key`; revisar que la URL de escritura apunta solo a una base desechable antes de probar el workflow. En **Settings → Error Workflow**, elegir el `08 · Error Workflow` local. Mantener IMAP deshabilitado y el workflow inactivo.

Un ID explícito no se sustituye por una búsqueda nominal si da 404. Un 404 queda disponible para la decisión manual; 401, 5xx y fallos de red son errores técnicos para el workflow 08. El GET por sí solo no registra abonos; la escritura solo ocurre tras las reglas de #36 y #37.

## Verificación

`node --test tests/test_hu03_busqueda.cjs` comprueba el método, URL, autenticación y el paso hacia la decisión integrada. También comprueba que el POST y el correo están conectados únicamente a ramas posteriores con guardas. Es una prueba estática/local; no acredita una consulta en vivo de n8n.
