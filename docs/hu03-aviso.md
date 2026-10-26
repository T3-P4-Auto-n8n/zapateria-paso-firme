# HU-03 · Aviso de revisión a Marisa (#38)

## Alcance

Las rutas de revisión por extracción inválida, candidato dudoso, fuera de plazo, saldo insuficiente o respuesta 422/404 envían un correo de texto plano mediante `Mailpit` al buzón de pruebas `tienda@pasofirme.example`. El mensaje incluye motivo, ordenante, importe, método original cuando puede identificarse, concepto, referencia y los candidatos de API disponibles (ID, cliente, producto, talla, pendiente, fecha límite y estado).

El flujo no reenvía el cuerpo original del banco, no registra pagos y no envía recibos al cliente. Recomienda a Marisa revisar y, si corresponde, registrar manualmente. Los valores no confiables se limitan y limpian de saltos de línea y pseudoencabezados. Se muestran hasta 20 candidatos y se indica si hay más.

## Configuración

Importar `workflows/03-abonos-distancia-aviso.json`, asignar `Groq`, `API Tienda` y `Mailpit`, y seleccionar el `08 · Error Workflow` local en **Settings**. Mantener IMAP deshabilitado y el workflow inactivo. El envío solo debe probarse con las nueve notificaciones ficticias; el buzón Mailpit es local y no entrega correo externo.

## Verificación

`tests/test_hu03_aviso.cjs` simula los datos de revisión y comprueba el texto, método, candidato, rama sin candidato, limpieza de contenido hostil, ambos puntos de entrada y credencial SMTP. La suite completa HU-03 pasa 35/35. No se envió ningún correo durante estas pruebas. Importación y comprobación visual en n8n quedan pendientes.
