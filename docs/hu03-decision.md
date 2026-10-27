# HU-03 · Decisión de apartado (#36)

## Workflow integrado

La decisión está integrada en `workflows/03-abonos-distancia.json`, después de la consulta GET. **Decidir apartado (#36)** solo devuelve `registrar` si hay un único apartado compatible con ordenante y producto, activo, en plazo y con pendiente suficiente. La siguiente condición permite a #37 preparar el POST solo por esa salida; el resto se deriva a revisión #38 y Mailpit.

Un concepto vacío, cero o varios candidatos, discrepancias, un apartado vencido/inactivo, saldo insuficiente o 404 explícito requieren revisión. Un ID explícito nunca cambia a búsqueda nominal si falla. Se comparan nombres y productos sin distinguir mayúsculas o tildes; las iniciales solo pueden coincidir si también concuerda el producto. 401 y 5xx son errores técnicos para el workflow 08.

## Pruebas

`node --test tests/test_hu03_decision.cjs` ejecuta el Code node de la exportación integrada con respuestas simuladas y cubre coincidencia única, concepto vacío, candidatos cero/múltiples, discrepancias, tildes/iniciales, vencimiento, estado, saldo, 404 y errores HTTP. La prueba estructural confirma que `registrar` va al POST protegido de #37 y las decisiones dudosas al correo de revisión.

Esta prueba no sustituye la ejecución E2E en n8n. Mantener el workflow inactivo y usar solo correos de ejemplo con una API desechable aislada.
