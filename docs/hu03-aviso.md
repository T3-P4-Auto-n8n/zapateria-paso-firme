# HU-03 · Aviso de revisión a la tienda (#38)

## Workflow integrado

El aviso forma parte de `workflows/03-abonos-distancia.json`. Las rutas de entrada inválida, extracción dudosa, apartado no coincidente, vencido, saldo insuficiente y respuestas 422/404 llegan a **Preparar aviso de revisión (#38)** y se envían en texto plano a `tienda@pasofirme.example` mediante la credencial local `Mailpit`.

El aviso incluye motivo, ordenante, importe, método original cuando se puede identificar, concepto, referencia y candidatos disponibles. Los valores no confiables se limitan y limpian de saltos de línea y pseudoencabezados. El mensaje no reenvía el cuerpo del banco. La ruta de éxito no envía un recibo duplicado: HU-02 gestiona el recibo después del 201.

Importar solo `workflows/03-abonos-distancia.json`; seleccionar las credenciales locales `Groq`, `API Tienda`, `Mailpit` y `08 · Error Workflow`. Mantener IMAP deshabilitado, el workflow inactivo y Mailpit como SMTP local. Los mensajes de revisión no deben salir a una dirección externa.

## Verificación

`node --test tests/test_hu03_aviso.cjs` comprueba el texto, el motivo, el método, candidatos, entrada sin candidato, limpieza de contenido hostil, fuentes de revisión, credencial SMTP y conexión a Mailpit. La suite estática no entrega correo. La verificación completa en n8n/Mailpit y sus capturas sigue pendiente.
