# HU-03 · Decisión de apartado (#36)

## Alcance

Esta etapa recibe la respuesta HTTP de #35 y los campos ya validados por #34. Solo permite continuar a #37 si hay un único candidato compatible con el ordenante y el producto, el apartado sigue activo, está dentro de plazo y `pendiente` cubre el importe. Concepto vacío, cero o varios candidatos, discrepancias o reglas incumplidas van a revisión (#38). No registra abonos ni envía correo.

Un ID explícito nunca se sustituye por una búsqueda nominal cuando la API responde 404. Se comparan nombres y productos sin distinguir mayúsculas ni tildes; las iniciales del ordenante pueden coincidir con el nombre completo de la API cuando el producto también concuerda. Si el GET devuelve 401 o 5xx, la etapa lanza un error técnico para el workflow 08.

## Configuración y seguridad

Importar `workflows/03-abonos-distancia-decision.json` en n8n, asignar `Groq` y `API Tienda`, y elegir el `08 · Error Workflow` local en **Settings**. Mantener IMAP deshabilitado, el workflow inactivo y usar solo los correos ficticios. El handoff a #37 es un No Operation: la escritura se implementa en la tarea siguiente. La rama #38 también queda como No Operation hasta su tarea de aviso. No publicar este flujo.

## Verificación

`tests/test_hu03_decision.cjs` ejecuta el Code node con respuestas simuladas: coincidencia válida, concepto vacío, cero/múltiples candidatos, identidad/producto discrepante, tildes e iniciales, vencimiento, estado no activo, saldo insuficiente, 404 explícito y errores 401/5xx. También comprueba que solo la llamada de Groq es POST y que no hay nodos de email. Estas pruebas no sustituyen la importación y prueba real en n8n; siguen pendientes la credencial, llamada a la API y selección del workflow 08 local.
